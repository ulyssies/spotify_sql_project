from typing import List, Optional

import spotipy

from app.database import supabase

ALL_RANGES = ["short_term", "medium_term", "long_term"]


def _build_seen_ids(sp: spotipy.Spotify, user_id: str) -> set:
    seen: set = set()

    for range_ in ALL_RANGES:
        result = (
            supabase.table("top_tracks")
            .select("spotify_track_id")
            .eq("user_id", user_id)
            .eq("time_range", range_)
            .execute()
        )
        seen.update(r["spotify_track_id"] for r in (result.data or []))

    try:
        recent = sp.current_user_recently_played(limit=50)
        seen.update(item["track"]["id"] for item in recent.get("items", []))
    except Exception:
        pass

    return seen


def _format_track(track: dict) -> dict:
    images = track["album"].get("images", [])
    return {
        "track_name":    track["name"],
        "artist_name":   track["artists"][0]["name"],
        "album_name":    track["album"].get("name"),
        "album_art_url": images[0]["url"] if images else None,
        "spotify_url":   track["external_urls"].get("spotify"),
        "preview_url":   track.get("preview_url"),
        "popularity":    track.get("popularity"),
    }


def get_recommendations(
    sp: spotipy.Spotify,
    user_id: str,
) -> Optional[List[dict]]:
    """
    Build recommendations via related artists since Spotify deprecated
    the /recommendations endpoint in Nov 2024.

    Flow:
      1. Fetch user's top artists (long_term for strongest signal)
      2. For each top artist, fetch related artists from Spotify
      3. Pull top tracks from those related artists
      4. Filter against seen_ids (all stored top tracks + recently played)
      5. Return first 5 unseen tracks
    """
    # Step 1 — top artists as seed sources
    top_artist_ids: List[str] = []
    for time_range in ("long_term", "medium_term", "short_term"):
        try:
            resp = sp.current_user_top_artists(limit=5, time_range=time_range)
            top_artist_ids = [a["id"] for a in resp.get("items", [])]
            if top_artist_ids:
                break
        except Exception:
            pass

    if not top_artist_ids:
        return None

    seen_ids = _build_seen_ids(sp, user_id)
    top_artist_id_set = set(top_artist_ids)

    # Step 2 — collect related artist IDs (skip artists user already knows)
    candidate_artist_ids: List[str] = []
    for artist_id in top_artist_ids[:3]:
        try:
            related = sp.artist_related_artists(artist_id)
            for a in related.get("artists", [])[:6]:
                if a["id"] not in top_artist_id_set and a["id"] not in candidate_artist_ids:
                    candidate_artist_ids.append(a["id"])
        except Exception:
            pass

    if not candidate_artist_ids:
        return None

    # Step 3 & 4 — pull top tracks from related artists, filter seen
    results: List[dict] = []
    seen_result_ids: set = set()

    for artist_id in candidate_artist_ids[:10]:
        if len(results) >= 5:
            break
        try:
            tracks_resp = sp.artist_top_tracks(artist_id)
            for track in tracks_resp.get("tracks", []):
                if track["id"] in seen_ids or track["id"] in seen_result_ids:
                    continue
                seen_result_ids.add(track["id"])
                results.append(_format_track(track))
                if len(results) >= 5:
                    break
        except Exception:
            pass

    return results if results else None
