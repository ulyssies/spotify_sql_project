from collections import defaultdict
from itertools import combinations
from typing import List

from app.database import supabase


def get_genre_map(user_id: str, time_range: str) -> dict:
    # Fetch all rows from both tables — no limit, no threshold filtering.
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

    # Build artist_name → merged genre set from BOTH sources.
    # An artist present in both tables gets the union of both genre lists.
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

    # Build graph from the merged per-artist genre sets.
    # No minimum weight — every genre, no matter how rare, produces a node.
    genre_artist_pairs: set = set()
    genre_to_artists: dict = defaultdict(set)

    for artist_name, genres in artist_genres_merged.items():
        for genre in genres:
            genre_artist_pairs.add((genre, artist_name))
            genre_to_artists[genre].add(artist_name)

    genre_nodes = [
        {
            "id": g,
            "label": g,
            "weight": len(genre_to_artists[g]),
        }
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
        "genre_nodes": genre_nodes,
        "artist_nodes": artist_nodes,
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

    # Build artist id → artist record map
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

    # Track nodes keyed to parent artist by name
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

    # Artist-artist links via shared genres
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
