"""
Bulk-import Spotify Extended Streaming History into Supabase.

Usage:
    cd api
    python scripts/import_history.py --dir "/path/to/Spotify Extended Streaming History"

The script auto-detects the user from the `users` table (first row).
Pass --user-id to target a specific user.
"""

import argparse
import glob
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import supabase  # noqa: E402 — path must be set first

BATCH_SIZE = 500


def load_all_plays(directory: str) -> list[dict]:
    pattern = os.path.join(directory, "Streaming_History_Audio_*.json")
    files = sorted(glob.glob(pattern))
    if not files:
        sys.exit(f"No Streaming_History_Audio_*.json files found in: {directory}")

    plays: list[dict] = []
    for f in files:
        with open(f, encoding="utf-8") as fh:
            plays.extend(json.load(fh))
    return plays


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


def transform(plays: list[dict], user_id: str) -> list[dict]:
    rows = []
    for p in plays:
        track_name = p.get("master_metadata_track_name")
        uri = p.get("spotify_track_uri")
        if not track_name or not uri:
            continue

        rows.append({
            "user_id":           user_id,
            "played_at":         p["ts"],
            "ms_played":         int(p["ms_played"]),
            "track_name":        track_name,
            "artist_name":       p["master_metadata_album_artist_name"],
            "album_name":        p.get("master_metadata_album_album_name"),
            "spotify_track_uri": uri,
        })
    return rows


def upsert_batches(rows: list[dict]) -> tuple[int, int]:
    total = len(rows)
    imported = 0
    skipped = 0

    for i in range(0, total, BATCH_SIZE):
        batch = rows[i : i + BATCH_SIZE]
        result = (
            supabase.table("streaming_history")
            .upsert(
                batch,
                on_conflict="user_id,played_at,spotify_track_uri",
                ignore_duplicates=True,
            )
            .execute()
        )
        inserted = len(result.data) if result.data else 0
        imported += inserted
        skipped += len(batch) - inserted

        done = min(i + BATCH_SIZE, total)
        print(f"  {done:,}/{total:,}  (+{inserted} new)")

    return imported, skipped


def main() -> None:
    parser = argparse.ArgumentParser(description="Import Spotify extended streaming history")
    parser.add_argument(
        "--dir",
        default=os.path.expanduser(
            "~/Downloads/Spotify Extended Streaming History"
        ),
        help="Path to the unzipped Spotify Extended Streaming History folder",
    )
    parser.add_argument("--user-id", default=None, help="Supabase user UUID (auto-detected if omitted)")
    args = parser.parse_args()

    print(f"Loading plays from: {args.dir}")
    plays = load_all_plays(args.dir)
    print(f"  {len(plays):,} raw records")

    user_id = get_user_id(args.user_id)
    print(f"Target user: {user_id}")

    rows = transform(plays, user_id)
    print(f"  {len(rows):,} music plays to import\n")

    print("Upserting to Supabase...")
    imported, skipped = upsert_batches(rows)

    print(f"\nDone. {imported:,} new rows inserted, {skipped:,} already existed.")


if __name__ == "__main__":
    main()
