from datetime import datetime, timezone
from typing import List

from app.database import supabase

THRESHOLD = 4.0


def _bucket_genres(genres: List[dict], snapshot_at: str) -> List[dict]:
    sorted_genres = sorted(genres, key=lambda x: x["percentage"], reverse=True)
    top = [g for g in sorted_genres if g["percentage"] >= THRESHOLD][:7]
    tail = [g for g in sorted_genres if g["percentage"] < THRESHOLD]

    if tail:
        top.append({
            "genre": f"Other ({len(tail)} genres)",
            "percentage": round(sum(g["percentage"] for g in tail), 1),
            "other_genres": [g["genre"] for g in tail],
            "snapshot_at": snapshot_at,
        })

    return sorted(top, key=lambda x: x["percentage"], reverse=True)


def get_genre_distribution(user_id: str, time_range: str) -> List[dict]:
    """
    Compute genre distribution directly from top_tracks.

    Percentage = tracks_featuring_genre / total_tracks * 100.
    This gives "share of your top tracks in this genre" rather than
    share of raw genre-tag occurrences, so singleton genres register
    ~4% and fall below the bucketing threshold instead of all tying.
    """
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
    snapshot_at = tracks[0].get("snapshot_at") or datetime.now(tz=timezone.utc).isoformat()

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
