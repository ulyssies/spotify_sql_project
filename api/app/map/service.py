from collections import defaultdict
from datetime import datetime, timedelta, timezone
from itertools import combinations
from typing import List, Optional

from app.database import supabase

# Mirrors getGenreColor() priority order in GenreMap.tsx
_FAMILY_CHECKS = [
    ("hip-hop",    ["rap", "hip hop", "hip-hop", "trap", "drill", "grime", "crunk", "bounce", "dirty south"]),
    ("r-and-b",    ["r&b", "rnb", "soul", "funk", "gospel", "motown", "neo soul", "quiet storm", "contemporary r", "urban"]),
    ("pop",        ["pop", "boy band", "girl group", "bubblegum", "europop", "k-pop", "j-pop", "c-pop"]),
    ("rock",       ["rock", "metal", "punk", "grunge", "hardcore", "emo", "screamo", "post-hardcore", "nu metal", "garage"]),
    ("indie",      ["indie", "alternative", "alt ", "lo-fi", "lo fi", "bedroom", "college", "jangle"]),
    ("electronic", ["electronic", "edm", "house", "techno", "trance", "dubstep", "drum and bass", "dnb", "electro", "ambient", "synthwave", "synth", "dance", "club", "rave", "bass", "beats", "chillwave", "vaporwave", "vapor", "wave"]),
    ("folk",       ["folk", "country", "americana", "bluegrass", "western", "cowboy", "outlaw", "red dirt", "roots"]),
    ("jazz",       ["jazz", "blues", "swing", "bebop", "bossa", "soul jazz", "latin jazz"]),
    ("classical",  ["classical", "baroque", "orchestra", "opera", "chamber", "symphony", "choral", "choir", "piano", "string"]),
    ("dream",      ["dream", "shoegaze", "slowcore", "witch", "goth", "dark", "atmospheric", "ethereal", "noise", "post rock", "post-rock"]),
    ("latin",      ["latin", "reggaeton", "salsa", "cumbia", "bachata", "samba", "flamenco", "tropical"]),
    ("reggae",     ["reggae", "ska", "dub", "dancehall", "afrobeat", "afropop"]),
]

_FAMILY_LABELS = {
    "hip-hop":    "Hip-Hop",
    "r-and-b":    "R&B",
    "pop":        "Pop",
    "rock":       "Rock",
    "indie":      "Indie / Alt",
    "electronic": "Electronic",
    "folk":       "Folk",
    "jazz":       "Jazz",
    "classical":  "Classical",
    "dream":      "Dream",
    "latin":      "Latin",
    "reggae":     "Reggae",
}


def _classify_family(genre: str) -> str:
    g = genre.lower()
    for family, keywords in _FAMILY_CHECKS:
        if any(kw in g for kw in keywords):
            return family
    return "other"


_RANGE_CONFIG = {
    # (start_offset_days | None, min_total_ms)
    "short_term":  (28,  300_000),    #  5 minutes — 28-day window is already narrow
    "medium_term": (180, 900_000),    # 15 minutes — 6-month window
    "long_term":   (None, 3_600_000), # 60 minutes — all time
}


def _time_range_params(time_range: str) -> dict:
    days, min_ms = _RANGE_CONFIG.get(time_range, (None, 1_800_000))
    start_date = None
    if days:
        start_date = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    return {"p_start_date": start_date, "p_min_total_ms": min_ms}


def get_genre_map(user_id: str, time_range: str) -> dict:
    params: dict = {"p_user_id": user_id, **_time_range_params(time_range)}

    rows = (
        supabase.rpc("get_map_artists", params).execute()
    ).data or []

    artist_genres_merged: dict = defaultdict(set)
    artist_play_count: dict = defaultdict(int)
    artist_ms: dict = defaultdict(int)

    for row in rows:
        name = row.get("artist_name", "")
        if not name:
            continue
        artist_play_count[name] = row.get("play_count", 0)
        artist_ms[name] = row.get("total_ms_played", 0)
        for genre in (row.get("genres") or []):
            artist_genres_merged[name].add(genre)

    genre_artist_pairs: set = set()
    genre_to_artists: dict = defaultdict(set)

    for artist_name, genres in artist_genres_merged.items():
        for genre in genres:
            genre_artist_pairs.add((genre, artist_name))
            genre_to_artists[genre].add(artist_name)

    # Classify and immediately drop "other" — unclassified genres add noise without structure
    genre_family: dict = {
        g: _classify_family(g)
        for g in genre_to_artists
        if _classify_family(g) != "other"
    }
    # Rebuild genre_to_artists keeping only classified genres
    genre_to_artists = {g: genre_to_artists[g] for g in genre_family}
    genre_artist_pairs = {(g, a) for g, a in genre_artist_pairs if g in genre_family}

    # Roll up total_ms per subgenre from artist listening data
    genre_ms: dict = {
        g: sum(artist_ms[a] for a in genre_to_artists[g])
        for g in genre_to_artists
    }

    # ── Subgenre filtering ────────────────────────────────────────────────────
    MIN_SUBGENRE_MS = 3_600_000  # 1 hour
    MAX_SUBGENRES_PER_FAMILY = 12

    # snapshot counts before filtering for the log
    family_before: dict = defaultdict(int)
    for g, fam in genre_family.items():
        family_before[fam] += 1

    # 1. drop subgenres below the 1-hour threshold
    genre_family = {g: fam for g, fam in genre_family.items() if genre_ms.get(g, 0) >= MIN_SUBGENRE_MS}

    # 2. cap each family to its top 12 subgenres by total_ms
    family_subgenres: dict = defaultdict(list)
    for g, fam in genre_family.items():
        family_subgenres[fam].append(g)

    kept_genres: set = set()
    for fam, genres in family_subgenres.items():
        top_n = sorted(genres, key=lambda g: genre_ms[g], reverse=True)[:MAX_SUBGENRES_PER_FAMILY]
        kept_genres.update(top_n)

    genre_family     = {g: fam for g, fam in genre_family.items() if g in kept_genres}
    genre_to_artists = {g: genre_to_artists[g] for g in genre_family}
    genre_ms         = {g: ms for g, ms in genre_ms.items() if g in genre_family}
    genre_artist_pairs = {(g, a) for g, a in genre_artist_pairs if g in genre_family}

    # log before/after per family
    family_after: dict = defaultdict(int)
    for g, fam in genre_family.items():
        family_after[fam] += 1
    print("[genre_map] subgenre reduction per family:")
    for fam in sorted(set(list(family_before.keys()) + list(family_after.keys()))):
        label = _FAMILY_LABELS.get(fam, fam)
        print(f"  {label}: {family_before.get(fam, 0)} → {family_after.get(fam, 0)}")

    # ── Orphaned artists: all their subgenres were filtered out ───────────────
    artists_with_subgenres = {a for _, a in genre_artist_pairs}
    all_classified_artists = {
        a for a in artist_genres_merged
        if any(_classify_family(g) != "other" for g in artist_genres_merged[a])
    }
    orphaned: set = all_classified_artists - artists_with_subgenres

    # assign each orphan to its dominant family (majority vote across its genre tags)
    orphan_family: dict = {}
    for a in orphaned:
        votes: dict = defaultdict(int)
        for g in artist_genres_merged[a]:
            fam = _classify_family(g)
            if fam != "other":
                votes[fam] += 1
        if votes:
            orphan_family[a] = max(votes, key=lambda f: votes[f])

    # ── Roll up family ms after filtering ────────────────────────────────────
    family_ms: dict = defaultdict(int)
    for g, family in genre_family.items():
        family_ms[family] += genre_ms[g]

    genre_nodes = [
        {
            "id": g,
            "label": g,
            "total_ms": genre_ms[g],
            "family": genre_family[g],
        }
        for g in genre_to_artists
    ]

    parent_nodes = [
        {
            "id": f"parent:{family}",
            "label": _FAMILY_LABELS.get(family, family.title()),
            "family": family,
            "total_ms": family_ms[family],
        }
        for family in family_ms
    ]

    parent_genre_links = [
        {"source": f"parent:{genre_family[g]}", "target": g}
        for g in genre_to_artists
    ]

    # artists with subgenres + orphans reassigned to their parent family
    artist_node_ids = artists_with_subgenres | set(orphan_family.keys())
    artist_nodes = [
        {
            "id": a,
            "label": a,
            "play_count": artist_play_count.get(a, 0),
            "total_ms": artist_ms.get(a, 0),
            "genres": [g for g in artist_genres_merged[a] if g in genre_family],
        }
        for a in artist_node_ids
    ]

    genre_artist_links = [
        {"source": genre, "target": artist}
        for genre, artist in genre_artist_pairs
    ]

    # direct parent→artist links for orphaned artists
    parent_artist_links = [
        {"source": f"parent:{orphan_family[a]}", "target": a}
        for a in orphan_family
    ]

    affinity_links: List[dict] = []
    genre_list = list(genre_to_artists.keys())
    for g_a, g_b in combinations(genre_list, 2):
        shared = genre_to_artists[g_a] & genre_to_artists[g_b]
        if shared:
            affinity_links.append({
                "source": g_a,
                "target": g_b,
                "shared": len(shared),
            })

    return {
        "parent_nodes": parent_nodes,
        "genre_nodes": genre_nodes,
        "artist_nodes": artist_nodes,
        "parent_genre_links": parent_genre_links,
        "genre_artist_links": genre_artist_links,
        "parent_artist_links": parent_artist_links,
        "genre_affinity_links": affinity_links,
    }


def get_artist_map(user_id: str, time_range: str) -> dict:
    artists_result = (
        supabase.table("top_artists")
        .select("spotify_artist_id, artist_name, artist_image_url, rank, genres")
        .eq("user_id", user_id)
        .eq("time_range", time_range)
        .order("rank")
        .execute()
    )
    artists = artists_result.data or []

    tracks_result = (
        supabase.table("top_tracks")
        .select("spotify_track_id, track_name, album_art_url, artist_name")
        .eq("user_id", user_id)
        .eq("time_range", time_range)
        .execute()
    )
    tracks = tracks_result.data or []

    artist_by_name: dict = {a["artist_name"]: a for a in artists}

    artist_nodes = [
        {
            "id": a["spotify_artist_id"],
            "label": a["artist_name"],
            "image_url": a.get("artist_image_url"),
            "rank": a["rank"],
            "genres": a.get("genres") or [],
        }
        for a in artists
    ]

    track_nodes = []
    for t in tracks:
        artist_rec = artist_by_name.get(t["artist_name"])
        if artist_rec:
            track_nodes.append({
                "id": t["spotify_track_id"],
                "label": t["track_name"],
                "album_art_url": t.get("album_art_url"),
                "artist_id": artist_rec["spotify_artist_id"],
            })

    artist_links: List[dict] = []
    for i, j in combinations(range(len(artists)), 2):
        a_i = artists[i]
        a_j = artists[j]
        genres_i = set(a_i.get("genres") or [])
        genres_j = set(a_j.get("genres") or [])
        shared = list(genres_i & genres_j)
        if shared:
            artist_links.append({
                "source": a_i["spotify_artist_id"],
                "target": a_j["spotify_artist_id"],
                "shared_genres": shared,
                "n": len(shared),
            })

    return {
        "artist_nodes": artist_nodes,
        "track_nodes": track_nodes,
        "artist_links": artist_links,
    }
