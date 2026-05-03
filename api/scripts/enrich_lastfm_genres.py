"""
Fill genre gaps using Last.fm tags for artists with empty Spotify genres.

Queries artist_genres for rows with empty genres, hits Last.fm's
artist.getTopTags endpoint for each, filters to music-genre tags,
and updates the rows in place.

Usage:
    cd api
    python3 scripts/enrich_lastfm_genres.py

Requires LASTFM_API_KEY in .env.
"""

import os
import sys
import time
from typing import List, Optional

import requests

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config import settings  # noqa: E402
from app.database import supabase  # noqa: E402

LASTFM_URL = "https://ws.audioscrobbler.com/2.0/"
SLEEP_SECS = 0.2  # Last.fm allows 5 req/sec
MIN_TAG_COUNT = 10  # ignore tags with very low counts (noise)

# Tags that are not genres — Last.fm is community-sourced so these slip in
NON_GENRE_TAGS = {
    "seen live", "favorites", "favourite", "love", "amazing", "great",
    "awesome", "cool", "good", "best", "beautiful", "sexy", "hot",
    "my music", "all", "music", "songs", "albums", "bands", "artists",
    "spotify", "youtube", "soundcloud", "heard on pandora",
    "under 2000 listeners", "via lastfm",
    "singer-songwriter", "singer songwriter",
}


PAGE_SIZE = 1_000


def get_empty_artists() -> List[dict]:
    """Return all artist_genres rows with empty or null genres, paginated."""
    empty = []
    offset = 0
    while True:
        rows = (
            supabase.table("artist_genres")
            .select("artist_name, genres")
            .range(offset, offset + PAGE_SIZE - 1)
            .execute()
        ).data or []
        for r in rows:
            genres = r.get("genres") or []
            if not genres:
                empty.append(r)
        if len(rows) < PAGE_SIZE:
            break
        offset += PAGE_SIZE
    return empty


def fetch_lastfm_tags(artist_name: str) -> Optional[List[str]]:
    try:
        resp = requests.get(LASTFM_URL, params={
            "method": "artist.getTopTags",
            "artist": artist_name,
            "api_key": settings.lastfm_api_key,
            "format": "json",
            "autocorrect": 1,
        }, timeout=5)
        data = resp.json()

        tags = data.get("toptags", {}).get("tag", [])
        genres = []
        for tag in tags:
            name = tag.get("name", "").strip().lower()
            count = int(tag.get("count", 0))
            if count >= MIN_TAG_COUNT and name not in NON_GENRE_TAGS and len(name) > 1:
                genres.append(name)
        return genres or None
    except Exception as e:
        print(f"  Last.fm error for {artist_name!r}: {e}")
        return None


def main() -> None:
    if not settings.lastfm_api_key:
        sys.exit("LASTFM_API_KEY not set in .env")

    artists = get_empty_artists()
    total = len(artists)
    print(f"{total:,} artists with empty genres to enrich via Last.fm\n")

    if not total:
        print("Nothing to do.")
        return

    updated = 0
    still_empty = 0

    for i, row in enumerate(artists, start=1):
        name = row["artist_name"]
        genres = fetch_lastfm_tags(name)

        if genres:
            supabase.table("artist_genres").update(
                {"genres": genres}
            ).eq("artist_name", name).execute()
            updated += 1
        else:
            still_empty += 1

        if i % 50 == 0 or i == total:
            print(f"  {i:,}/{total:,} — {name!r} → {genres or []}")

        time.sleep(SLEEP_SECS)

    print(f"\nDone. {updated:,} artists filled in, {still_empty:,} still empty.")


if __name__ == "__main__":
    main()
