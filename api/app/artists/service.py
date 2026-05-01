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
    if time_range not in TIME_RANGES:
        raise ValueError(f"Invalid time_range '{time_range}' — must be one of {TIME_RANGES}")

    result = (
        supabase.table("top_artists")
        .select("*")
        .eq("user_id", user_id)
        .eq("time_range", time_range)
        .order("rank")
        .execute()
    )
    artists = result.data or []

    if not artists:
        return artists

    try:
        if time_range == "long_term":
            history_result = supabase.rpc("history_top_artists", {
                "p_user_id": str(user_id),
                "p_limit": 50,
            }).execute()
            history_by_name = {
                row["artist_name"].lower(): row
                for row in (history_result.data or [])
            }

            for artist in artists:
                hist = history_by_name.get(artist["artist_name"].lower())
                if hist:
                    artist["total_plays"] = hist["plays"]
                    artist["total_minutes"] = round(hist["total_ms"] / 60000)
                else:
                    artist["total_plays"] = None
                    artist["total_minutes"] = None

            artists_with_ms = [a for a in artists if a.get("total_minutes")]
            artists_without_ms = [a for a in artists if not a.get("total_minutes")]

            if len(artists_with_ms) >= 5:
                artists_with_ms.sort(key=lambda x: x["total_minutes"], reverse=True)
                for i, a in enumerate(artists_with_ms):
                    a["rank"] = i + 1
                artists = artists_with_ms + artists_without_ms

        else:
            cutoff = _get_date_cutoff(time_range)
            artist_names = [a["artist_name"] for a in artists]

            sh_query = (
                supabase.table("streaming_history")
                .select("artist_name, ms_played")
                .eq("user_id", user_id)
                .in_("artist_name", artist_names)
                .limit(100000)
            )
            if cutoff:
                sh_query = sh_query.gte("played_at", cutoff.isoformat())
            sh_result = sh_query.execute()

            artist_stats: dict = {}
            for row in sh_result.data or []:
                name = (row["artist_name"] or "").lower()
                if name not in artist_stats:
                    artist_stats[name] = {"plays": 0, "ms": 0}
                artist_stats[name]["plays"] += 1
                artist_stats[name]["ms"] += row["ms_played"]

            enriched = 0
            for artist in artists:
                stats = artist_stats.get(artist["artist_name"].lower())
                if stats and stats["plays"] > 0:
                    artist["total_plays"] = stats["plays"]
                    artist["total_minutes"] = round(stats["ms"] / 60000)
                    enriched += 1
                else:
                    artist["total_plays"] = None
                    artist["total_minutes"] = None

            min_enriched = 3 if time_range == "short_term" else 5
            if enriched >= min_enriched:
                artists_with_ms = [a for a in artists if a.get("total_minutes")]
                artists_without_ms = [a for a in artists if not a.get("total_minutes")]
                artists_with_ms.sort(key=lambda x: x["total_minutes"], reverse=True)
                for i, a in enumerate(artists_with_ms):
                    a["rank"] = i + 1
                artists = artists_with_ms + artists_without_ms

    except Exception as e:
        print(f"Artist enrichment error: {e}")

    return artists
