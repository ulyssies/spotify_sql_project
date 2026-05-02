"""
Populate artist_genres using Spotify track URIs from streaming_history.

Instead of searching by artist name (unreliable), this script:
  1. Collects all distinct spotify_track_uri values from streaming_history
  2. Batch-fetches track metadata (50 at a time) to extract Spotify artist IDs
  3. Batch-fetches artist metadata (50 at a time) to get accurate genre tags
  4. Upserts into artist_genres — overwrites any stale name-search data

Usage:
    cd api
    python3 scripts/enrich_artist_genres.py [--user-id UUID]

Uses client credentials flow — no user login needed.
Skips artists already enriched with a spotify_artist_id (resumable).
"""

import argparse
import os
import sys
import time
from typing import Dict, List, Optional, Set

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import spotipy  # noqa: E402
from spotipy.oauth2 import SpotifyClientCredentials  # noqa: E402

from app.config import settings  # noqa: E402
from app.database import supabase  # noqa: E402

TRACK_BATCH = 50
ARTIST_BATCH = 50
PAGE_SIZE = 1_000
SLEEP_SECS = 0.05


def get_user_id(user_id_arg: Optional[str]) -> str:
    if user_id_arg:
        return user_id_arg
    result = supabase.table("users").select("id, display_name").limit(5).execute()
    users = result.data or []
    if not users:
        sys.exit("No users found in Supabase. Log in to the app first.")
    if len(users) > 1:
        print("Multiple users found:")
        for u in users:
            print(f"  {u['id']}  {u.get('display_name', '')}")
        sys.exit("Pass --user-id <id> to select one.")
    return users[0]["id"]


def get_all_track_uris(user_id: str) -> List[str]:
    """Paginate streaming_history and return all distinct track URIs."""
    seen: Set[str] = set()
    offset = 0
    while True:
        rows = (
            supabase.table("streaming_history")
            .select("spotify_track_uri")
            .eq("user_id", user_id)
            .range(offset, offset + PAGE_SIZE - 1)
            .execute()
        ).data or []
        for row in rows:
            uri = row.get("spotify_track_uri") or ""
            if uri.startswith("spotify:track:"):
                seen.add(uri)
        if len(rows) < PAGE_SIZE:
            break
        offset += PAGE_SIZE
    return list(seen)


def get_already_enriched() -> Set[str]:
    """Return spotify_artist_ids already correctly enriched (have a non-null ID)."""
    rows = (
        supabase.table("artist_genres")
        .select("spotify_artist_id")
        .not_.is_("spotify_artist_id", "null")
        .limit(500_000)
        .execute()
    ).data or []
    return {r["spotify_artist_id"] for r in rows if r.get("spotify_artist_id")}


def fetch_artist_map(sp: spotipy.Spotify, track_ids: List[str]) -> Dict[str, str]:
    """Batch-fetch tracks and return {artist_id: artist_name} for the primary artist."""
    artist_map: Dict[str, str] = {}
    total = len(track_ids)
    for i in range(0, total, TRACK_BATCH):
        batch = track_ids[i:i + TRACK_BATCH]
        try:
            result = sp.tracks(batch)
            for track in (result.get("tracks") or []):
                if not track:
                    continue
                artists = track.get("artists") or []
                if artists:
                    artist_map[artists[0]["id"]] = artists[0]["name"]
        except Exception as e:
            print(f"  Track batch error at {i}: {e}")
        if (i // TRACK_BATCH) % 20 == 0:
            print(f"  tracks {min(i + TRACK_BATCH, total):,}/{total:,} — {len(artist_map):,} artists so far")
        time.sleep(SLEEP_SECS)
    return artist_map


def fetch_genre_map(sp: spotipy.Spotify, artist_ids: List[str]) -> Dict[str, List[str]]:
    """Batch-fetch artists and return {artist_id: [genres]}."""
    genre_map: Dict[str, List[str]] = {}
    total = len(artist_ids)
    for i in range(0, total, ARTIST_BATCH):
        batch = artist_ids[i:i + ARTIST_BATCH]
        try:
            result = sp.artists(batch)
            for artist in (result.get("artists") or []):
                if not artist:
                    continue
                genre_map[artist["id"]] = artist.get("genres") or []
        except Exception as e:
            print(f"  Artist batch error at {i}: {e}")
        time.sleep(SLEEP_SECS)
    return genre_map


def main() -> None:
    parser = argparse.ArgumentParser(description="Enrich artist_genres via Spotify track URIs")
    parser.add_argument("--user-id", default=None, help="Supabase user UUID")
    args = parser.parse_args()

    user_id = get_user_id(args.user_id)
    print(f"User: {user_id}\n")

    sp = spotipy.Spotify(auth_manager=SpotifyClientCredentials(
        client_id=settings.spotify_client_id,
        client_secret=settings.spotify_client_secret,
    ))

    print("Collecting track URIs from streaming history...")
    uris = get_all_track_uris(user_id)
    track_ids = [u.replace("spotify:track:", "") for u in uris]
    print(f"  {len(track_ids):,} distinct tracks\n")

    print("Fetching artist IDs from tracks...")
    artist_map = fetch_artist_map(sp, track_ids)
    print(f"  {len(artist_map):,} distinct artists found\n")

    already_enriched = get_already_enriched()
    to_enrich = [(aid, aname) for aid, aname in artist_map.items() if aid not in already_enriched]
    print(f"  {len(already_enriched):,} already enriched, {len(to_enrich):,} to fetch\n")

    if not to_enrich:
        print("Nothing to do.")
        return

    print("Fetching genres for artists...")
    genre_map = fetch_genre_map(sp, [aid for aid, _ in to_enrich])

    print("\nUpserting into artist_genres...")
    # Deduplicate by lowercase name — two Spotify artist IDs can share a name.
    # Prefer the entry that has genres over one that doesn't.
    deduped: Dict[str, dict] = {}
    for aid, aname in to_enrich:
        key = aname.lower()
        row = {"artist_name": key, "spotify_artist_id": aid, "genres": genre_map.get(aid, [])}
        if key not in deduped or (not deduped[key]["genres"] and row["genres"]):
            deduped[key] = row
    rows = list(deduped.values())

    for i in range(0, len(rows), 500):
        batch = rows[i:i + 500]
        supabase.table("artist_genres").upsert(
            batch, on_conflict="artist_name"
        ).execute()
        print(f"  {min(i + 500, len(rows)):,}/{len(rows):,} upserted")

    with_genres = sum(1 for r in rows if r["genres"])
    print(f"\nDone. {with_genres:,}/{len(rows):,} artists have genre data ({round(with_genres * 100 / len(rows), 1)}% coverage)")


if __name__ == "__main__":
    main()
