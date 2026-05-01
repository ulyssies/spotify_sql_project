"""
Populate artist_genres table with Spotify genre data for every artist
in streaming_history.

Usage:
    cd api
    python scripts/enrich_artist_genres.py [--user-id UUID]

Uses client credentials flow — no user login needed.
Skips artists already in the table (fully resumable).
"""

import argparse
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import spotipy  # noqa: E402
from spotipy.oauth2 import SpotifyClientCredentials  # noqa: E402

from app.config import settings  # noqa: E402
from app.database import supabase  # noqa: E402

BATCH_SIZE = 100
SLEEP_SECS = 0.05


def get_user_id(user_id_arg: str | None) -> str:
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


def get_unenriched_artists(user_id: str) -> list[str]:
    """Return lowercase artist names from streaming_history not yet in artist_genres."""
    # Paginate streaming_history to collect all artist names
    all_names: set[str] = set()
    page_size = 10_000
    offset = 0
    while True:
        rows = (
            supabase.table("streaming_history")
            .select("artist_name")
            .eq("user_id", user_id)
            .range(offset, offset + page_size - 1)
            .execute()
        ).data or []
        for row in rows:
            name = (row.get("artist_name") or "").strip().lower()
            if name:
                all_names.add(name)
        if len(rows) < page_size:
            break
        offset += page_size

    # Already-enriched names (stored lowercase)
    ag_rows = (
        supabase.table("artist_genres")
        .select("artist_name")
        .limit(500_000)
        .execute()
    ).data or []
    enriched = {(r["artist_name"] or "").lower() for r in ag_rows}

    return sorted(all_names - enriched)


def lookup_artist(sp: spotipy.Spotify, name: str) -> tuple[list[str], str | None]:
    try:
        result = sp.search(q=f'artist:"{name}"', type="artist", limit=1)
        items = result["artists"]["items"]
        if items:
            artist = items[0]
            return artist.get("genres", []), artist["id"]
    except Exception as e:
        print(f"  Spotify search error for {name!r}: {e}")
    return [], None


def main() -> None:
    parser = argparse.ArgumentParser(description="Enrich artist_genres from Spotify API")
    parser.add_argument("--user-id", default=None, help="Supabase user UUID")
    args = parser.parse_args()

    user_id = get_user_id(args.user_id)
    print(f"User: {user_id}")

    sp = spotipy.Spotify(auth_manager=SpotifyClientCredentials(
        client_id=settings.spotify_client_id,
        client_secret=settings.spotify_client_secret,
    ))

    artists = get_unenriched_artists(user_id)
    total = len(artists)
    print(f"{total:,} artists to enrich\n")

    if not total:
        print("Nothing to do.")
        return

    batch: list[dict] = []

    for i, name in enumerate(artists, start=1):
        genres, spotify_artist_id = lookup_artist(sp, name)

        batch.append({
            "artist_name": name,          # stored lowercase
            "spotify_artist_id": spotify_artist_id,
            "genres": genres,
        })

        if i % 50 == 0 or i == total:
            print(f"  {i:,}/{total:,} — {name!r} → {genres}")

        if len(batch) >= BATCH_SIZE or i == total:
            supabase.table("artist_genres").upsert(
                batch, on_conflict="artist_name"
            ).execute()
            batch = []

        time.sleep(SLEEP_SECS)

    print("\nDone.")


if __name__ == "__main__":
    main()
