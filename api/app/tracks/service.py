from collections import Counter
from datetime import datetime, timedelta, timezone
from typing import List, Optional

import spotipy

from app.database import supabase

TIME_RANGES = {"short_term", "medium_term", "long_term"}


def _get_date_cutoff(time_range: str) -> Optional[datetime]:
    now = datetime.now(timezone.utc)
    if time_range == "short_term":
        return now - timedelta(weeks=4)
    if time_range == "medium_term":
        return now - timedelta(days=180)
    return None


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
        all_genres: List[str] = []
        for a in item["artists"]:
            all_genres.extend(_get_artist_genres(sp, a["id"]))
        genres = list(set(all_genres))
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


def get_top_tracks(user_id: str, time_range: str, sp: Optional[spotipy.Spotify] = None) -> List[dict]:
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
        track_ids = [t["spotify_track_id"] for t in tracks]
        track_uris = [f"spotify:track:{tid}" for tid in track_ids]
        cutoff = _get_date_cutoff(time_range)
        sh_query = (
            supabase.table("streaming_history")
            .select("spotify_track_uri, ms_played, played_at")
            .eq("user_id", user_id)
            .in_("spotify_track_uri", track_uris)
            .limit(50000)
        )
        if cutoff:
            sh_query = sh_query.gte("played_at", cutoff.isoformat())
        sh_result = sh_query.execute()
        stats_by_id: dict = {}
        for row in sh_result.data or []:
            tid = row["spotify_track_uri"].replace("spotify:track:", "")
            if tid not in stats_by_id:
                stats_by_id[tid] = {"play_count": 0, "ms_total": 0, "first": row["played_at"]}
            s = stats_by_id[tid]
            s["play_count"] += 1
            s["ms_total"] += row["ms_played"]
            if row["played_at"] < s["first"]:
                s["first"] = row["played_at"]
        for track in tracks:
            s = stats_by_id.get(track["spotify_track_id"])
            if s:
                track["play_count"] = s["play_count"]
                track["minutes_played"] = round(s["ms_total"] / 60000)
                track["first_listened"] = s["first"][:10]

        if time_range == "long_term":
            history_top = supabase.rpc("history_top_tracks", {
                "p_user_id": str(user_id),
                "p_limit": 50,
            }).execute()
            existing_ids = {t["spotify_track_id"] for t in tracks}
            for ht in history_top.data or []:
                track_id = ht["spotify_track_uri"].replace("spotify:track:", "")
                if track_id not in existing_ids:
                    tracks.append({
                        "id": None,
                        "time_range": time_range,
                        "snapshot_at": None,
                        "track_name": ht["track_name"],
                        "artist_name": ht["artist_name"],
                        "spotify_track_id": track_id,
                        "play_count": ht["plays"],
                        "minutes_played": round(ht["total_ms"] / 60000),
                        "rank": 999,
                        "album_art_url": None,
                        "album_name": None,
                        "genres": [],
                        "popularity": None,
                        "first_listened": None,
                    })
                    existing_ids.add(track_id)

        tracks_with_counts = [t for t in tracks if t.get("play_count")]
        tracks_without_counts = [t for t in tracks if not t.get("play_count")]

        if len(tracks_with_counts) >= 5:
            tracks_with_counts.sort(key=lambda x: x["play_count"], reverse=True)
            for i, t in enumerate(tracks_with_counts):
                t["rank"] = i + 1
            tracks = tracks_with_counts + tracks_without_counts

        if sp is not None:
            missing_art = [t for t in tracks if not t.get("album_art_url")]
            if missing_art:
                ids = [t["spotify_track_id"] for t in missing_art[:50]]
                try:
                    results = sp.tracks(ids)
                    art_map = {
                        t["id"]: t["album"]["images"][0]["url"]
                        if t["album"]["images"] else None
                        for t in results["tracks"]
                        if t
                    }
                    for track in missing_art:
                        track["album_art_url"] = art_map.get(track["spotify_track_id"])
                except Exception as e:
                    print(f"Album art fetch failed: {e}")

    except Exception as e:
        print(f"Track enrichment error: {e}")

    return tracks
