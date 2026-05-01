from datetime import datetime, timezone
from typing import List, Optional

from app.database import supabase
from app.import_.models import StreamingHistoryItemIn


def upsert_streaming_history(user_id: str, items: List[StreamingHistoryItemIn]) -> dict:
    rows = [
        {
            "user_id": user_id,
            "played_at": item.ts,
            "ms_played": item.ms_played,
            "track_name": item.master_metadata_track_name,
            "artist_name": item.master_metadata_album_artist_name,
            "album_name": item.master_metadata_album_album_name,
            "spotify_track_uri": item.spotify_track_uri,
        }
        for item in items
    ]

    # upsert — on conflict (user_id, played_at, spotify_track_uri) do nothing
    result = (
        supabase.table("streaming_history")
        .upsert(rows, on_conflict="user_id,played_at,spotify_track_uri", ignore_duplicates=True)
        .execute()
    )

    inserted = len(result.data) if result.data else 0
    duplicates_skipped = len(items) - inserted
    return {"imported": inserted, "duplicates_skipped": duplicates_skipped}


def get_import_status(user_id: str) -> Optional[dict]:
    result = (
        supabase.table("streaming_history")
        .select("played_at, ms_played")
        .eq("user_id", user_id)
        .order("played_at", desc=False)
        .execute()
    )

    rows = result.data or []
    if not rows:
        return None

    dates = [r["played_at"] for r in rows]
    last_import = max(dates)

    return {
        "total_streams": len(rows),
        "date_range": {"from": dates[0][:10], "to": dates[-1][:10]},
        "last_import": last_import,
    }


def get_play_stats_for_tracks(user_id: str, spotify_track_uris: List[str]) -> dict:
    """Return {uri: {play_count, minutes_played, first_listened}} for a batch of URIs."""
    if not spotify_track_uris:
        return {}

    result = (
        supabase.table("streaming_history")
        .select("spotify_track_uri, ms_played, played_at")
        .eq("user_id", user_id)
        .in_("spotify_track_uri", spotify_track_uris)
        .execute()
    )

    rows = result.data or []
    stats: dict = {}
    for row in rows:
        uri = row["spotify_track_uri"]
        if uri not in stats:
            stats[uri] = {"play_count": 0, "ms_total": 0, "first": row["played_at"]}
        s = stats[uri]
        s["play_count"] += 1
        s["ms_total"] += row["ms_played"]
        if row["played_at"] < s["first"]:
            s["first"] = row["played_at"]

    return {
        uri: {
            "play_count": s["play_count"],
            "minutes_played": round(s["ms_total"] / 60000),
            "first_listened": s["first"][:10],
        }
        for uri, s in stats.items()
    }
