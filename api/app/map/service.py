from collections import defaultdict
from itertools import combinations
from typing import List

from app.database import supabase

# Mirrors getGenreColor() priority order in GenreMap.tsx
_FAMILY_CHECKS = [
    ("hip-hop",    ["rap", "hip hop", "hip-hop", "trap", "drill", "grime", "crunk", "bounce", "dirty south"]),
    ("r-and-b",    ["r&b", "soul", "funk", "gospel", "motown", "neo soul", "quiet storm", "contemporary r", "urban"]),
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
    "other":      "Other",
}


def _classify_family(genre: str) -> str:
    g = genre.lower()
    for family, keywords in _FAMILY_CHECKS:
        if any(kw in g for kw in keywords):
            return family
    return "other"


def get_genre_map(user_id: str, time_range: str) -> dict:
    tracks_result = (
        supabase.table("top_tracks")
        .select("spotify_track_id, artist_name, genres")
        .eq("user_id", user_id)
        .eq("time_range", time_range)
        .execute()
    )
    tracks = tracks_result.data or []

    artists_result = (
        supabase.table("top_artists")
        .select("artist_name, genres")
        .eq("user_id", user_id)
        .eq("time_range", time_range)
        .execute()
    )
    top_artists = artists_result.data or []

    artist_genres_merged: dict = defaultdict(set)
    artist_track_count: dict = defaultdict(int)

    for track in tracks:
        name = track.get("artist_name", "")
        if not name:
            continue
        artist_track_count[name] += 1
        for genre in (track.get("genres") or []):
            artist_genres_merged[name].add(genre)

    for artist in top_artists:
        name = artist.get("artist_name", "")
        if not name:
            continue
        for genre in (artist.get("genres") or []):
            artist_genres_merged[name].add(genre)

    genre_artist_pairs: set = set()
    genre_to_artists: dict = defaultdict(set)

    for artist_name, genres in artist_genres_merged.items():
        for genre in genres:
            genre_artist_pairs.add((genre, artist_name))
            genre_to_artists[genre].add(artist_name)

    genre_family: dict = {g: _classify_family(g) for g in genre_to_artists}

    genre_nodes = [
        {
            "id": g,
            "label": g,
            "weight": len(genre_to_artists[g]),
            "family": genre_family[g],
        }
        for g in genre_to_artists
    ]

    # One parent node per family that has at least one genre
    family_weights: dict = defaultdict(int)
    for g, family in genre_family.items():
        family_weights[family] += len(genre_to_artists[g])

    parent_nodes = [
        {
            "id": f"parent:{family}",
            "label": _FAMILY_LABELS.get(family, family.title()),
            "family": family,
            "weight": family_weights[family],
        }
        for family in family_weights
    ]

    parent_genre_links = [
        {"source": f"parent:{genre_family[g]}", "target": g}
        for g in genre_to_artists
    ]

    artist_node_ids = {pair[1] for pair in genre_artist_pairs}
    artist_nodes = [
        {
            "id": a,
            "label": a,
            "track_count": artist_track_count.get(a, 0),
            "genres": list(artist_genres_merged[a]),
        }
        for a in artist_node_ids
    ]

    genre_artist_links = [
        {"source": genre, "target": artist}
        for genre, artist in genre_artist_pairs
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
