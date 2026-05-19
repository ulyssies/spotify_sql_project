from collections import Counter
import re
from typing import Dict, List, Optional, Set, Tuple

import spotipy

from app.database import supabase
from app.genres.service import _classify_family, _family_label, _normalize_genre

ALL_RANGES = ["short_term", "medium_term", "long_term"]
RANGE_FALLBACKS = {
    "short_term": ["short_term", "medium_term", "long_term"],
    "medium_term": ["medium_term", "long_term", "short_term"],
    "long_term": ["long_term", "medium_term", "short_term"],
}
MAX_RECOMMENDATIONS = 24
MAX_HISTORY_TRACK_TOTALS = 15000
MAX_TRACK_LISTENING_MS = 60 * 60 * 1000


def _normalize_track_identity(track_name: Optional[str], artist_name: Optional[str]) -> Optional[str]:
    if not track_name or not artist_name:
        return None

    name = track_name.lower()
    name = re.sub(r"\s*\([^)]*(remaster|remastered|radio edit|single version|deluxe|explicit|clean|sped up|slowed|live|mono|stereo)[^)]*\)", "", name)
    name = re.sub(r"\s*-\s*(remaster(ed)?|radio edit|single version|deluxe|explicit|clean|sped up|slowed|live|mono|stereo).*$", "", name)
    name = re.sub(r"\s+", " ", name).strip()

    artist = artist_name.split(",")[0].lower().strip()
    return f"{name}::{artist}" if name and artist else None


def _track_id_from_uri(uri: Optional[str]) -> Optional[str]:
    if not uri:
        return None
    if uri.startswith("spotify:track:"):
        return uri.split(":")[-1]
    if "/track/" in uri:
        return uri.split("/track/")[-1].split("?")[0]
    return uri


def _weighted_tags(genres: Optional[List[str]]) -> List[str]:
    seen: Set[str] = set()
    tags: List[str] = []

    for genre in genres or []:
        normalized = _normalize_genre(genre)
        if normalized and normalized not in seen:
            seen.add(normalized)
            tags.append(normalized)

    for genre in list(tags):
        family = _classify_family(genre)
        label = _family_label(family)
        if label and label != "other" and label not in seen:
            seen.add(label)
            tags.append(label)

    return tags


def _safe_spotify_call(label: str, fn) -> Optional[dict]:
    try:
        return fn()
    except Exception:
        return None


def _format_track(track: dict) -> dict:
    images = track.get("album", {}).get("images", [])
    artists = track.get("artists") or []
    artist_name = ", ".join(a.get("name", "") for a in artists if a.get("name")) or "Unknown artist"

    return {
        "spotify_track_id": track.get("id"),
        "track_name": track.get("name"),
        "artist_name": artist_name,
        "album_name": track.get("album", {}).get("name"),
        "album_art_url": images[0]["url"] if images else None,
        "spotify_url": track.get("external_urls", {}).get("spotify"),
        "preview_url": track.get("preview_url"),
        "popularity": track.get("popularity"),
    }


def _spotify_ids_for_history_track(row: dict) -> List[str]:
    uris = [row.get("spotify_track_uri") or ""]
    uris.extend(row.get("spotify_track_uris") or [])

    seen: Set[str] = set()
    track_ids: List[str] = []
    for uri in uris:
        track_id = _track_id_from_uri(uri)
        if track_id and track_id not in seen:
            seen.add(track_id)
            track_ids.append(track_id)
    return track_ids


def _build_listening_totals(user_id: str) -> Tuple[Dict[str, int], Dict[str, int]]:
    track_id_totals: Dict[str, int] = {}
    identity_totals: Dict[str, int] = {}

    try:
        history = supabase.rpc("history_top_tracks", {
            "p_user_id": user_id,
            "p_year": None,
            "p_limit": MAX_HISTORY_TRACK_TOTALS,
        }).execute()
        rows = history.data or []
    except Exception:
        rows = []

    if not rows:
        history = (
            supabase.table("streaming_history")
            .select("spotify_track_uri,track_name,artist_name,ms_played")
            .eq("user_id", user_id)
            .limit(MAX_HISTORY_TRACK_TOTALS)
            .execute()
        )
        rows = history.data or []

    for row in rows:
        total_ms = row.get("total_ms") or row.get("ms_played") or 0
        key = _normalize_track_identity(row.get("track_name"), row.get("artist_name"))
        if key:
            identity_totals[key] = identity_totals.get(key, 0) + total_ms
        for track_id in _spotify_ids_for_history_track(row):
            track_id_totals[track_id] = track_id_totals.get(track_id, 0) + total_ms

    return track_id_totals, identity_totals


def _append_seed(
    seeds: List[dict],
    seen_seed_keys: Set[str],
    artist_id: Optional[str],
    artist_name: Optional[str],
    genres: Optional[List[str]],
    rank: int,
    source: str,
) -> None:
    if not artist_id or not artist_name:
        return

    key = artist_id or artist_name.lower()
    if key in seen_seed_keys:
        return

    seen_seed_keys.add(key)
    seeds.append({
        "id": artist_id,
        "name": artist_name,
        "genres": genres or [],
        "rank": rank,
        "source": source,
    })


def _load_seed_artists(sp: spotipy.Spotify, user_id: str, time_range: str) -> List[dict]:
    seeds: List[dict] = []
    seen_seed_keys: Set[str] = set()

    for range_ in RANGE_FALLBACKS.get(time_range, ALL_RANGES):
        result = (
            supabase.table("top_artists")
            .select("spotify_artist_id,artist_name,genres,rank")
            .eq("user_id", user_id)
            .eq("time_range", range_)
            .order("rank")
            .limit(16)
            .execute()
        )
        for row in result.data or []:
            _append_seed(
                seeds,
                seen_seed_keys,
                row.get("spotify_artist_id"),
                row.get("artist_name"),
                row.get("genres") or [],
                row.get("rank") or len(seeds) + 1,
                "saved_top_artist",
            )
        if len(seeds) >= 10:
            break

    for range_ in RANGE_FALLBACKS.get(time_range, ALL_RANGES):
        resp = _safe_spotify_call(
            "current_user_top_artists",
            lambda range_=range_: sp.current_user_top_artists(limit=16, time_range=range_),
        )
        for rank, artist in enumerate((resp or {}).get("items", []), start=1):
            _append_seed(
                seeds,
                seen_seed_keys,
                artist.get("id"),
                artist.get("name"),
                artist.get("genres") or [],
                rank,
                "spotify_top_artist",
            )
        if len(seeds) >= 12:
            break

    return seeds[:16]


def _load_taste_weights(user_id: str, time_range: str, seed_artists: List[dict]) -> Counter:
    weights: Counter = Counter()

    for seed in seed_artists:
        amount = max(8, 70 - (seed.get("rank") or 1) * 4)
        for tag in _weighted_tags(seed.get("genres")):
            weights[tag] += amount

    tracks = (
        supabase.table("top_tracks")
        .select("genres,rank")
        .eq("user_id", user_id)
        .eq("time_range", time_range)
        .order("rank")
        .limit(50)
        .execute()
    )
    for row in tracks.data or []:
        amount = max(5, 55 - (row.get("rank") or 1))
        for tag in _weighted_tags(row.get("genres") or []):
            weights[tag] += amount

    return weights


def _match_tags(candidate_genres: List[str], taste_weights: Counter) -> List[str]:
    tags = _weighted_tags(candidate_genres)
    matched = [tag for tag in tags if tag in taste_weights]
    matched.sort(key=lambda tag: taste_weights[tag], reverse=True)
    return matched[:5]


def _candidate_reason(source: str, source_artist: str, matched_tags: List[str]) -> str:
    if source == "favorite_artist":
        return f"Popular low-listen song from {source_artist}"
    if source == "related_artist":
        if matched_tags:
            return f"Near {source_artist} in your {matched_tags[0]} lane"
        return f"Popular artist connected to {source_artist}"
    if matched_tags:
        return f"Popular track matched to {matched_tags[0]}"
    return "Popular song outside your played tracks"


def _candidate_score(
    track: dict,
    candidate_genres: List[str],
    source_weight: float,
    taste_weights: Counter,
) -> Tuple[float, List[str]]:
    popularity = track.get("popularity") or 0
    matched_tags = _match_tags(candidate_genres, taste_weights)
    top_weight = max(taste_weights.values(), default=1)
    match_strength = sum(taste_weights[tag] for tag in matched_tags) / top_weight if matched_tags else 0
    score = (popularity * 0.65) + min(28, match_strength * 16) + source_weight
    return score, matched_tags


def _add_candidate(
    candidates: Dict[str, dict],
    track: dict,
    track_id_totals: Dict[str, int],
    identity_totals: Dict[str, int],
    candidate_genres: List[str],
    source: str,
    source_artist: str,
    source_weight: float,
    taste_weights: Counter,
) -> None:
    artists = track.get("artists") or []
    artist_name = artists[0].get("name") if artists else None
    track_id = track.get("id")
    identity = _normalize_track_identity(track.get("name"), artist_name)

    if not track_id or not identity:
        return

    listening_ms = max(track_id_totals.get(track_id, 0), identity_totals.get(identity, 0))
    if listening_ms >= MAX_TRACK_LISTENING_MS:
        return

    score, matched_tags = _candidate_score(track, candidate_genres, source_weight, taste_weights)
    if identity in candidates and candidates[identity].get("match_score", 0) >= score:
        return

    formatted = _format_track(track)
    formatted.update({
        "source": source,
        "source_artist": source_artist,
        "reason": _candidate_reason(source, source_artist, matched_tags),
        "match_score": round(score, 2),
        "listening_ms": listening_ms,
        "matched_genres": matched_tags[:3],
        "matched_subgenres": [tag for tag in matched_tags if tag not in {"hip hop", "r&b", "pop", "rock", "indie / alt", "electronic", "folk", "jazz", "classical", "dream", "latin", "reggae"}][:4],
    })
    candidates[identity] = formatted


def _candidate_genre_searches(taste_weights: Counter) -> List[str]:
    blocked = {"other"}
    return [
        genre
        for genre, _ in taste_weights.most_common(10)
        if genre not in blocked and len(genre) > 2
    ][:6]


def get_recommendations(
    sp: spotipy.Spotify,
    user_id: str,
    time_range: str = "long_term",
) -> List[dict]:
    """
    Build popular low-exposure song recommendations from the user's listening graph.

    Spotify's old recommendations endpoint is no longer reliable, so this uses
    available catalog surfaces: top tracks from favorite artists, related artists
    when available, and genre search fallbacks. Candidates are filtered so their
    imported all-time listening total stays below one hour.
    """
    if time_range not in ALL_RANGES:
        time_range = "short_term"

    seed_artists = _load_seed_artists(sp, user_id, time_range)
    if not seed_artists:
        return []

    track_id_totals, identity_totals = _build_listening_totals(user_id)
    taste_weights = _load_taste_weights(user_id, time_range, seed_artists)
    candidates: Dict[str, dict] = {}

    for seed in seed_artists[:12]:
        tracks_resp = _safe_spotify_call(
            "artist_top_tracks",
            lambda seed=seed: sp.artist_top_tracks(seed["id"]),
        )
        for track in (tracks_resp or {}).get("tracks", []):
            _add_candidate(
                candidates,
                track,
                track_id_totals,
                identity_totals,
                seed.get("genres") or [],
                "favorite_artist",
                seed["name"],
                max(8, 22 - seed.get("rank", 1)),
                taste_weights,
            )

    top_seed_ids = {seed["id"] for seed in seed_artists}
    for seed in seed_artists[:6]:
        related = _safe_spotify_call(
            "artist_related_artists",
            lambda seed=seed: sp.artist_related_artists(seed["id"]),
        )
        for related_artist in (related or {}).get("artists", [])[:8]:
            artist_id = related_artist.get("id")
            if not artist_id or artist_id in top_seed_ids:
                continue
            tracks_resp = _safe_spotify_call(
                "related_artist_top_tracks",
                lambda artist_id=artist_id: sp.artist_top_tracks(artist_id),
            )
            for track in (tracks_resp or {}).get("tracks", [])[:4]:
                _add_candidate(
                    candidates,
                    track,
                    track_id_totals,
                    identity_totals,
                    related_artist.get("genres") or seed.get("genres") or [],
                    "related_artist",
                    seed["name"],
                    max(5, 14 - seed.get("rank", 1)),
                    taste_weights,
                )

    for genre in _candidate_genre_searches(taste_weights):
        search = _safe_spotify_call(
            "genre_search",
            lambda genre=genre: sp.search(q=f'genre:"{genre}"', type="track", limit=8),
        )
        for track in ((search or {}).get("tracks") or {}).get("items", []):
            _add_candidate(
                candidates,
                track,
                track_id_totals,
                identity_totals,
                [genre],
                "genre_search",
                genre,
                6,
                taste_weights,
            )

    ranked = sorted(
        candidates.values(),
        key=lambda item: (
            item.get("match_score") or 0,
            item.get("popularity") or 0,
        ),
        reverse=True,
    )
    return ranked[:MAX_RECOMMENDATIONS]
