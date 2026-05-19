from datetime import datetime, timedelta, timezone
from typing import List, Optional

from app.database import supabase

THRESHOLD = 1.0
TOP_N = 12
RAW_TAG_LIMIT = 80

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
    "hip-hop":    "hip hop",
    "r-and-b":    "r&b",
    "pop":        "pop",
    "rock":       "rock",
    "indie":      "indie / alt",
    "electronic": "electronic",
    "folk":       "folk",
    "jazz":       "jazz",
    "classical":  "classical",
    "dream":      "dream",
    "latin":      "latin",
    "reggae":     "reggae",
    "other":      "other",
}

_GENRE_ALIASES: dict = {
    "hip-hop":          "hip hop",
    "hiphop":           "hip hop",
    "r&b":              "r&b",
    "rnb":              "r&b",
    "rhythm and blues": "r&b",
    "rhythm & blues":   "r&b",
    "lo fi":            "lo-fi",
}


def _get_date_cutoff(time_range: str) -> Optional[datetime]:
    now = datetime.now(timezone.utc)
    if time_range == "short_term":
        return now - timedelta(weeks=4)
    if time_range == "medium_term":
        return now - timedelta(days=180)
    return None


def _bucket_genres(genres: List[dict], snapshot_at: str) -> List[dict]:
    sorted_genres = sorted(genres, key=lambda x: x["percentage"], reverse=True)
    visible = [g for g in sorted_genres if g["percentage"] >= THRESHOLD]
    top = visible[:TOP_N]
    tail = visible[TOP_N:] + [g for g in sorted_genres if g["percentage"] < THRESHOLD]

    if tail:
        # Other is always pinned last — never sorted into the named genres
        top.append({
            "genre": f"Other ({len(tail)} genres)",
            "percentage": round(sum(g["percentage"] for g in tail), 1),
            "other_genres": [
                {
                    "genre": g["genre"],
                    "percentage": g["percentage"],
                }
                for g in tail
            ],
            "snapshot_at": snapshot_at,
        })

    return top


def _normalize_genre(genre: str) -> str:
    return _GENRE_ALIASES.get(genre.lower().strip(), genre.lower().strip())


def _classify_family(genre: str) -> str:
    normalized = _normalize_genre(genre)
    for family, keywords in _FAMILY_CHECKS:
        if any(keyword in normalized for keyword in keywords):
            return family
    return "other"


def _family_label(family: str) -> str:
    return _FAMILY_LABELS.get(family, family)


def _weighted_unique_tags(genres: List[str]) -> List[str]:
    seen = set()
    tags = []
    for genre in genres:
        normalized = _normalize_genre(genre)
        if normalized and normalized not in seen:
            seen.add(normalized)
            tags.append(normalized)
    return tags


def _add_genre_weights(parent_weights: dict, raw_weights: dict, genres: List[str], weight: int) -> None:
    raw_tags = _weighted_unique_tags(genres)
    if not raw_tags or weight <= 0:
        return

    families = sorted({_classify_family(genre) for genre in raw_tags if _classify_family(genre) != "other"})
    if not families:
        families = ["other"]

    family_share = weight / len(families)
    for family in families:
        parent_weights[_family_label(family)] = parent_weights.get(_family_label(family), 0) + family_share

    raw_share = weight / len(raw_tags)
    for genre in raw_tags:
        raw_weights[genre] = raw_weights.get(genre, 0) + raw_share


def _attach_subgenre_details(genres: List[dict], raw_weights: dict) -> List[dict]:
    raw_total = sum(raw_weights.values())
    if raw_total <= 0:
        return genres

    details_by_parent: dict = {}
    for genre, weight in raw_weights.items():
        family = _classify_family(genre)
        parent = _family_label(family)
        details_by_parent.setdefault(parent, []).append({
            "genre": genre,
            "percentage": round((weight / raw_total) * 100, 1),
        })

    for details in details_by_parent.values():
        details.sort(key=lambda item: item["percentage"], reverse=True)

    hydrated = []
    for genre in genres:
        hydrated.append({
            **genre,
            "subgenres": details_by_parent.get(genre["genre"], [])[:RAW_TAG_LIMIT],
        })
    return hydrated


def _build_distribution(parent_weights: dict, raw_weights: dict, snapshot_at: str) -> List[dict]:
    total = sum(parent_weights.values())
    if total <= 0:
        return []

    genres = [
        {
            "genre": genre,
            "percentage": round((weight / total) * 100, 1),
            "snapshot_at": snapshot_at,
        }
        for genre, weight in parent_weights.items()
    ]

    return _bucket_genres(_attach_subgenre_details(genres, raw_weights), snapshot_at)


def _get_genres_from_history(user_id: str, time_range: str, snapshot_at: str) -> List[dict]:
    """Build genre distribution from streaming_history weighted by ms_played."""
    cutoff = _get_date_cutoff(time_range)

    sh_query = (
        supabase.table("streaming_history")
        .select("artist_name, ms_played")
        .eq("user_id", user_id)
        .gte("ms_played", 30000)
        .limit(500_000)
    )
    if cutoff:
        sh_query = sh_query.gte("played_at", cutoff.isoformat())
    sh_result = sh_query.execute()

    artist_ms: dict = {}
    for row in sh_result.data or []:
        name = (row["artist_name"] or "").strip().lower()
        if name:
            artist_ms[name] = artist_ms.get(name, 0) + row["ms_played"]

    if not artist_ms:
        return []

    # Look up genres from artist_genres in batches of 500
    artist_names = list(artist_ms.keys())
    genre_lookup: dict = {}
    for i in range(0, len(artist_names), 500):
        batch = artist_names[i:i + 500]
        res = (
            supabase.table("artist_genres")
            .select("artist_name, genres")
            .in_("artist_name", batch)
            .execute()
        )
        for row in res.data or []:
            name = (row["artist_name"] or "").lower()
            genres = row.get("genres") or []
            if genres:
                genre_lookup[name] = genres

    # Roll raw tags into parent genre lanes while preserving subgenre percentages.
    parent_weights: dict = {}
    raw_weights: dict = {}
    for artist_name, ms in artist_ms.items():
        _add_genre_weights(parent_weights, raw_weights, genre_lookup.get(artist_name, []), ms)

    return _build_distribution(parent_weights, raw_weights, snapshot_at)


def _get_genres_from_top_tracks(user_id: str, time_range: str, snapshot_at: str) -> List[dict]:
    """Fallback: genre distribution from top_tracks table."""
    result = (
        supabase.table("top_tracks")
        .select("genres, snapshot_at")
        .eq("user_id", user_id)
        .eq("time_range", time_range)
        .execute()
    )
    tracks = result.data or []

    if not tracks:
        return []

    snapshot_at = tracks[0].get("snapshot_at") or snapshot_at

    parent_weights: dict = {}
    raw_weights: dict = {}
    for track in tracks:
        _add_genre_weights(parent_weights, raw_weights, track.get("genres") or [], 1)

    return _build_distribution(parent_weights, raw_weights, snapshot_at)


def get_genre_distribution(user_id: str, time_range: str) -> List[dict]:
    snapshot_at = datetime.now(tz=timezone.utc).isoformat()

    try:
        result = _get_genres_from_history(user_id, time_range, snapshot_at)
        if result:
            return result
    except Exception as e:
        print(f"Genre history enrichment error ({time_range}): {e}")

    return _get_genres_from_top_tracks(user_id, time_range, snapshot_at)
