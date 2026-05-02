"""
Strip non-genre tags (geographic, nationality, demographic, noise) from artist_genres.

Reads every row, removes blocked tags, updates rows where genres changed.
Safe to re-run — only writes rows that actually changed.

Usage:
    cd api
    python3 scripts/clean_genre_tags.py
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import supabase  # noqa: E402

PAGE_SIZE = 1_000

BLOCKED_TAGS = {
    # ── Countries / nationalities ─────────────────────────────────────────────
    "american", "united states", "usa", "u.s.a.", "us",
    "british", "uk", "united kingdom", "england", "english", "scottish", "welsh",
    "canadian", "canada",
    "australian", "australia",
    "german", "germany", "deutsch",
    "french", "france",
    "swedish", "sweden",
    "norwegian", "norway",
    "danish", "denmark",
    "finnish", "finland",
    "japanese", "japan",
    "korean", "korea", "south korea",
    "spanish", "spain",
    "italian", "italy",
    "brazilian", "brazil",
    "mexican", "mexico",
    "irish", "ireland",
    "dutch", "netherlands", "holland",
    "new zealand",
    "russian", "russia",
    "polish", "poland",
    "portuguese", "portugal",
    "greek", "greece",
    "turkish", "turkey",
    "indian", "india",
    "chinese", "china",
    "nigerian", "nigeria",
    "ghanaian", "ghana",
    "jamaican", "jamaica",
    "cuban", "cuba",
    "puerto rican", "puerto rico",
    "colombian", "colombia",
    "argentinian", "argentina",
    "chilean", "chile",
    "venezuelan", "venezuela",
    "icelandic", "iceland",
    "belgian", "belgium",
    "swiss", "switzerland",
    "austrian", "austria",
    "czech", "czech republic",
    "hungarian", "hungary",
    "romanian", "romania",
    "ukrainian", "ukraine",
    # ── Regions / cities ─────────────────────────────────────────────────────
    "west coast", "east coast", "southern", "midwest", "new england",
    "los angeles", "new york", "nyc", "london", "paris", "berlin",
    "chicago", "nashville", "tennessee", "virginia", "florida",
    "texas", "atlanta", "detroit", "toronto", "montreal",
    "columbus", "philadelphia", "miami", "houston", "boston",
    "seattle", "portland", "denver", "minneapolis", "cleveland",
    "pittsburgh", "baltimore", "memphis", "new orleans", "cincinnati",
    "oakland", "san francisco", "las vegas", "phoenix", "st. louis",
    "louisville", "charlotte", "raleigh", "richmond", "birmingham",
    "brighton", "manchester", "glasgow", "edinburgh", "bristol",
    "melbourne", "sydney", "auckland", "dublin", "amsterdam",
    "stockholm", "oslo", "copenhagen", "helsinki", "tokyo",
    "seoul", "beijing", "shanghai", "mumbai", "lagos",
    "scandinavia", "nordic", "latin america", "latin",
    "appalachia", "pacific northwest", "deep south",
    # ── Demographics ─────────────────────────────────────────────────────────
    "female vocalists", "male vocalists", "female vocalist", "male vocalist",
    "women", "men",
    # ── Noise / meta tags ────────────────────────────────────────────────────
    "seen live", "live",
    "favorites", "favourite", "favorites", "favourites",
    "love", "loved", "amazing", "awesome", "great", "good",
    "best", "beautiful", "sexy", "hot", "cool", "chill",
    "my music", "my top songs", "my favorites", "my favourite",
    "heard on pandora", "spotify", "youtube", "soundcloud",
    "via lastfm", "lastfm", "last.fm",
    "disney", "disney channel",
    "under 2000 listeners", "under 5000 listeners",
    "all", "music", "songs", "albums", "bands", "artists",
    "american music", "british music",
    "diy", "local",
}


def clean_genres(genres: list) -> list:
    return [g for g in genres if g.lower().strip() not in BLOCKED_TAGS]


def main() -> None:
    print("Loading artist_genres...\n")

    all_rows = []
    offset = 0
    while True:
        rows = (
            supabase.table("artist_genres")
            .select("artist_name, genres")
            .range(offset, offset + PAGE_SIZE - 1)
            .execute()
        ).data or []
        all_rows.extend(rows)
        if len(rows) < PAGE_SIZE:
            break
        offset += PAGE_SIZE

    print(f"{len(all_rows):,} artists loaded\n")

    to_update = []
    for row in all_rows:
        original = row.get("genres") or []
        cleaned = clean_genres(original)
        if cleaned != original:
            to_update.append({
                "artist_name": row["artist_name"],
                "genres": cleaned,
            })

    print(f"{len(to_update):,} artists have tags to clean\n")

    if not to_update:
        print("Nothing to do.")
        return

    for i in range(0, len(to_update), 500):
        batch = to_update[i:i + 500]
        for row in batch:
            supabase.table("artist_genres").update(
                {"genres": row["genres"]}
            ).eq("artist_name", row["artist_name"]).execute()
        print(f"  {min(i + 500, len(to_update)):,}/{len(to_update):,} updated")

    emptied = sum(1 for r in to_update if not r["genres"])
    print(f"\nDone. {len(to_update):,} artists cleaned, {emptied:,} now have no tags (better than bad tags).")


if __name__ == "__main__":
    main()
