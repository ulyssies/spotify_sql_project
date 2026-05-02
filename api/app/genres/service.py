from datetime import datetime, timedelta, timezone
from typing import List, Optional

from app.database import supabase

THRESHOLD = 1.0
TOP_N = 12


def _get_date_cutoff(time_range: str) -> Optional[datetime]:
    now = datetime.now(timezone.utc)
    if time_range == "short_term":
        return now - timedelta(weeks=4)
    if time_range == "medium_term":
        return now - timedelta(days=180)
    return None


def _bucket_genres(genres: List[dict], snapshot_at: str) -> List[dict]:
    sorted_genres = sorted(genres, key=lambda x: x["percentage"], reverse=True)
    top = [g for g in sorted_genres if g["percentage"] >= THRESHOLD][:TOP_N]
    tail = [g for g in sorted_genres if g["percentage"] < THRESHOLD]

    if tail:
        # Other is always pinned last — never sorted into the named genres
        top.append({
            "genre": f"Other ({len(tail)} genres)",
            "percentage": round(sum(g["percentage"] for g in tail), 1),
            "other_genres": [g["genre"] for g in tail],
            "snapshot_at": snapshot_at,
        })

    return top


_GENRE_ALIASES: dict = {
    "hip-hop":          "hip hop",
    "hiphop":           "hip hop",
    "r&b":              "r&b",
    "rnb":              "r&b",
    "rhythm and blues": "r&b",
    "rhythm & blues":   "r&b",
}


def _normalize_genre(genre: str) -> str:
    return _GENRE_ALIASES.get(genre.lower().strip(), genre.lower().strip())


def _get_genres_from_history(user_id: str, time_range: str, snapshot_at: str) -> List[dict]:
    """Build genre distribution from streaming_history weighted by ms_played."""
    cutoff = _get_date_cutoff(time_range)

    sh_query = (
        supabase.table("streaming_history")
        .select("artist_name, ms_played")
        .eq("user_id", user_id)
        .gte("ms_played", 30000)
        .limit(500_000)
    )
    if cutoff:
        sh_query = sh_query.gte("played_at", cutoff.isoformat())
    sh_result = sh_query.execute()

    artist_ms: dict = {}
    for row in sh_result.data or []:
        name = (row["artist_name"] or "").strip().lower()
        if name:
            artist_ms[name] = artist_ms.get(name, 0) + row["ms_played"]

    if not artist_ms:
        return []

    # Look up genres from artist_genres in batches of 500
    artist_names = list(artist_ms.keys())
    genre_lookup: dict = {}
    for i in range(0, len(artist_names), 500):
        batch = artist_names[i:i + 500]
        res = (
            supabase.table("artist_genres")
            .select("artist_name, genres")
            .in_("artist_name", batch)
            .execute()
        )
        for row in res.data or []:
            name = (row["artist_name"] or "").lower()
            genres = row.get("genres") or []
            if genres:
                genre_lookup[name] = genres

    # Weight genres by ms_played
    genre_weights: dict = {}
    for artist_name, ms in artist_ms.items():
        for genre in genre_lookup.get(artist_name, []):
            genre_weights[_normalize_genre(genre)] = genre_weights.get(_normalize_genre(genre), 0) + ms

    if not genre_weights:
        return []

    total = sum(genre_weights.values())
    genres = [
        {
            "genre": g,
            "percentage": round((ms / total) * 100, 1),
            "snapshot_at": snapshot_at,
        }
        for g, ms in genre_weights.items()
    ]

    return _bucket_genres(genres, snapshot_at)


def _get_genres_from_top_tracks(user_id: str, time_range: str, snapshot_at: str) -> List[dict]:
    """Fallback: genre distribution from top_tracks table."""
    result = (
        supabase.table("top_tracks")
        .select("genres, snapshot_at")
        .eq("user_id", user_id)
        .eq("time_range", time_range)
        .execute()
    )
    tracks = result.data or []

    if not tracks:
        return []

    total_tracks = len(tracks)
    snapshot_at = tracks[0].get("snapshot_at") or snapshot_at

    genre_track_counts: dict = {}
    for track in tracks:
        for genre in (track.get("genres") or []):
            genre_track_counts[genre] = genre_track_counts.get(genre, 0) + 1

    genres = [
        {
            "genre": g,
            "percentage": round((count / total_tracks) * 100, 1),
            "snapshot_at": snapshot_at,
        }
        for g, count in genre_track_counts.items()
    ]

    return _bucket_genres(genres, snapshot_at)


def get_genre_distribution(user_id: str, time_range: str) -> List[dict]:
    snapshot_at = datetime.now(tz=timezone.utc).isoformat()

    try:
        result = _get_genres_from_history(user_id, time_range, snapshot_at)
        if result:
            return result
    except Exception as e:
        print(f"Genre history enrichment error ({time_range}): {e}")

    return _get_genres_from_top_tracks(user_id, time_range, snapshot_at)
