from collections import Counter
from datetime import datetime, timezone
from typing import List

import spotipy

from app.database import supabase
from app.import_ import service as import_service

TIME_RANGES = {"short_term", "medium_term", "long_term"}


def _get_artist_genres(sp: spotipy.Spotify, artist_id: str) -> List[str]:
    """
    Fetch genre tags for a Spotify artist.

    Args:
        sp: Authenticated Spotipy client.
        artist_id: Spotify artist ID.

    Returns:
        List of genre strings, or empty list on any API failure.
    """
    try:
        return sp.artist(artist_id).get("genres", [])
    except Exception:
        return []


def sync_top_tracks(sp: spotipy.Spotify, user_id: str, time_range: str) -> List[dict]:
    """
    Run the full ETL pipeline for a user's top tracks.

    Pulls up to 25 top tracks for the given time range, enriches each track
    with artist genre data, replaces the user's existing rows for that range
    in Supabase, and recalculates genre percentages in genre_snapshots.
    Updates last_synced_at on the user row.

    Args:
        sp: Authenticated Spotipy client for the current user.
        user_id: The user's UUID in Supabase.
        time_range: One of 'short_term', 'medium_term', 'long_term'.

    Returns:
        List of inserted track row dicts.

    Raises:
        ValueError: If time_range is not one of the accepted values.
    """
    if time_range not in TIME_RANGES:
        raise ValueError(f"Invalid time_range '{time_range}' — must be one of {TIME_RANGES}")

    raw_tracks = sp.current_user_top_tracks(limit=50, time_range=time_range).get("items", [])

    rows = []
    for rank, item in enumerate(raw_tracks, start=1):
        artist = item["artists"][0]
        images = item["album"].get("images", [])
        genres = _get_artist_genres(sp, artist["id"])
        rows.append({
            "user_id": user_id,
            "spotify_track_id": item["id"],
            "track_name": item["name"],
            "artist_name": artist["name"],
            "album_name": item["album"].get("name"),
            "album_art_url": images[0]["url"] if images else None,
            "popularity": item.get("popularity"),
            "time_range": time_range,
            "rank": rank,
            "genres": genres,
            "snapshot_at": datetime.now(tz=timezone.utc).isoformat(),
        })

    # Replace stale rows for this user + time_range atomically
    supabase.table("top_tracks").delete().eq("user_id", user_id).eq("time_range", time_range).execute()
    result = supabase.table("top_tracks").insert(rows).execute()

    _sync_genre_snapshots(user_id=user_id, time_range=time_range, tracks=rows)

    supabase.table("users").update({
        "last_synced_at": datetime.now(tz=timezone.utc).isoformat()
    }).eq("id", user_id).execute()

    return result.data


def _sync_genre_snapshots(user_id: str, time_range: str, tracks: List[dict]) -> None:
    """
    Recalculate and replace genre percentage rows for a user and time range.

    Counts all genre strings across the given tracks, computes each genre's
    share as a percentage of total genre occurrences, and replaces the existing
    genre_snapshots rows for this user + time_range.

    Args:
        user_id: The user's UUID in Supabase.
        time_range: Time range these tracks belong to.
        tracks: Track row dicts — each must have a 'genres' key (list of strings).
    """
    all_genres = [g for track in tracks for g in (track.get("genres") or [])]
    total = len(all_genres)
    if total == 0:
        return

    counts = Counter(all_genres)
    snapshot_at = datetime.now(tz=timezone.utc).isoformat()

    supabase.table("genre_snapshots").delete().eq("user_id", user_id).eq("time_range", time_range).execute()
    supabase.table("genre_snapshots").insert([
        {
            "user_id": user_id,
            "time_range": time_range,
            "genre": genre,
            "percentage": round(count / total * 100, 2),
            "snapshot_at": snapshot_at,
        }
        for genre, count in counts.items()
    ]).execute()


def get_top_tracks(user_id: str, time_range: str) -> List[dict]:
    """
    Fetch a user's stored top tracks for a given time range.

    Args:
        user_id: The user's UUID in Supabase.
        time_range: One of 'short_term', 'medium_term', 'long_term'.

    Returns:
        List of track row dicts ordered by rank ascending.

    Raises:
        ValueError: If time_range is not one of the accepted values.
    """
    if time_range not in TIME_RANGES:
        raise ValueError(f"Invalid time_range '{time_range}' — must be one of {TIME_RANGES}")

    result = (
        supabase.table("top_tracks")
        .select("*")
        .eq("user_id", user_id)
        .eq("time_range", time_range)
        .order("rank")
        .execute()
    )
    tracks = result.data or []

    if not tracks:
        return tracks

    try:
        uris = [f"spotify:track:{t['spotify_track_id']}" for t in tracks]
        play_stats = import_service.get_play_stats_for_tracks(user_id=user_id, spotify_track_uris=uris)
        for track in tracks:
            uri = f"spotify:track:{track['spotify_track_id']}"
            stats = play_stats.get(uri)
            if stats:
                track["play_count"] = stats["play_count"]
                track["minutes_played"] = stats["minutes_played"]
                track["first_listened"] = stats["first_listened"]
    except Exception:
        pass

    return tracks
