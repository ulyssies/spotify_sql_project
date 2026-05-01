from datetime import datetime, timezone
from typing import List

import spotipy

from app.database import supabase

TIME_RANGES = {"short_term", "medium_term", "long_term"}


def sync_top_artists(sp: spotipy.Spotify, user_id: str, time_range: str) -> List[dict]:
    raw = sp.current_user_top_artists(limit=50, time_range=time_range)
    items = raw.get("items", [])

    rows = []
    for rank, artist in enumerate(items, start=1):
        images = artist.get("images") or []
        rows.append({
            "user_id": user_id,
            "spotify_artist_id": artist["id"],
            "artist_name": artist["name"],
            "artist_image_url": images[0]["url"] if images else None,
            "genres": artist.get("genres") or [],
            "popularity": artist.get("popularity"),
            "followers": (artist.get("followers") or {}).get("total"),
            "time_range": time_range,
            "rank": rank,
            "snapshot_at": datetime.now(tz=timezone.utc).isoformat(),
        })

    supabase.table("top_artists").delete().eq("user_id", user_id).eq("time_range", time_range).execute()
    if rows:
        result = supabase.table("top_artists").insert(rows).execute()
        return result.data or []
    return []


def get_top_artists(user_id: str, time_range: str) -> List[dict]:
    result = (
        supabase.table("top_artists")
        .select("*")
        .eq("user_id", user_id)
        .eq("time_range", time_range)
        .order("rank")
        .execute()
    )
    return result.data or []
