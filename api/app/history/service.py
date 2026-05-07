import re
from datetime import datetime
from typing import Optional

import spotipy

from app.database import supabase

HISTORY_FETCH_PAGE_SIZE = 1000


def _rpc(fn: str, params: dict):
    result = supabase.rpc(fn, params).execute()
    return result.data


def _year_bounds(year: int) -> tuple[str, str]:
    return (
        f"{year:04d}-01-01T00:00:00+00:00",
        f"{year + 1:04d}-01-01T00:00:00+00:00",
    )


def _streaming_history_rows(user_id: str, select: str, year: Optional[int] = None) -> list[dict]:
    rows: list[dict] = []
    offset = 0
    start, end = _year_bounds(year) if year is not None else (None, None)

    while True:
        query = (
            supabase.table("streaming_history")
            .select(select)
            .eq("user_id", user_id)
            .order("played_at")
        )
        if start and end:
            query = query.gte("played_at", start).lt("played_at", end)

        result = query.range(offset, offset + HISTORY_FETCH_PAGE_SIZE - 1).execute()
        batch = result.data or []
        rows.extend(batch)

        if len(batch) < HISTORY_FETCH_PAGE_SIZE:
            break
        offset += HISTORY_FETCH_PAGE_SIZE

    return rows


def _build_stats(rows: list[dict]) -> dict:
    music_rows = [row for row in rows if row.get("track_name")]
    artist_names = {
        row.get("artist_name")
        for row in music_rows
        if row.get("artist_name")
    }
    track_ids = {
        row.get("spotify_track_uri") or f"{row.get('artist_name')}:{row.get('track_name')}"
        for row in music_rows
        if row.get("spotify_track_uri") or row.get("track_name")
    }
    played_at_values = [
        row.get("played_at")
        for row in music_rows
        if row.get("played_at")
    ]

    skip_data_count = sum(1 for row in music_rows if row.get("skipped") is not None)
    shuffle_data_count = sum(1 for row in music_rows if row.get("shuffle") is not None)

    return {
        "total_plays": len(music_rows),
        "total_ms": sum(row.get("ms_played") or 0 for row in music_rows),
        "unique_artists": len(artist_names),
        "unique_tracks": len(track_ids),
        "skipped_count": sum(1 for row in music_rows if row.get("skipped") is True),
        "shuffle_count": sum(1 for row in music_rows if row.get("shuffle") is True),
        "skip_data_count": skip_data_count,
        "shuffle_data_count": shuffle_data_count,
        "meaningful_plays": sum(1 for row in music_rows if (row.get("ms_played") or 0) >= 30000),
        "first_played_at": min(played_at_values) if played_at_values else None,
        "last_played_at": max(played_at_values) if played_at_values else None,
    }


def get_stats(user_id: str, year: Optional[int] = None) -> dict:
    if year is None:
        stats = _rpc("history_stats", {"p_user_id": user_id}) or {}
        stats.setdefault("skip_data_count", None)
        stats.setdefault("shuffle_data_count", None)
        return stats

    base_select = "played_at, ms_played, track_name, artist_name, spotify_track_uri"
    try:
        rows = _streaming_history_rows(
            user_id,
            f"{base_select}, skipped, shuffle",
            year=year,
        )
    except Exception as exc:
        print(f"Could not load optional skip/shuffle metadata for {year}: {exc}")
        rows = _streaming_history_rows(user_id, base_select, year=year)
    return _build_stats(rows)


def get_yearly(user_id: str) -> list:
    return _rpc("history_yearly", {"p_user_id": user_id}) or []


def get_monthly(user_id: str, year: int) -> list:
    rows = _streaming_history_rows(
        user_id,
        "played_at, ms_played, track_name, artist_name, spotify_track_uri",
        year=year,
    )
    buckets = {
        month: {
            "month": month,
            "plays": 0,
            "total_ms": 0,
            "_artists": set(),
            "_tracks": set(),
        }
        for month in range(1, 13)
    }

    for row in rows:
        if not row.get("track_name"):
            continue

        parsed = _parse_played_at(row.get("played_at"))
        if not parsed:
            continue

        bucket = buckets[parsed.month]
        bucket["plays"] += 1
        bucket["total_ms"] += row.get("ms_played") or 0
        if row.get("artist_name"):
            bucket["_artists"].add(row["artist_name"])
        if row.get("spotify_track_uri") or row.get("track_name"):
            bucket["_tracks"].add(row.get("spotify_track_uri") or row["track_name"])

    return [
        {
            "month": bucket["month"],
            "plays": bucket["plays"],
            "total_ms": bucket["total_ms"],
            "unique_artists": len(bucket["_artists"]),
            "unique_tracks": len(bucket["_tracks"]),
        }
        for bucket in buckets.values()
    ]


def get_heatmap(user_id: str, year: Optional[int] = None) -> list:
    params = {"p_user_id": user_id, "p_year": year}
    return _rpc("history_heatmap", params) or []


def _parse_played_at(value) -> Optional[datetime]:
    if isinstance(value, datetime):
        return value
    if not value:
        return None
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except ValueError:
        return None


def _streaming_history_datetimes(user_id: str) -> list[datetime]:
    result = (
        supabase.table("streaming_history")
        .select("played_at")
        .eq("user_id", user_id)
        .limit(100000)
        .execute()
    )

    played_at: list[datetime] = []
    for row in result.data or []:
        parsed = _parse_played_at(row.get("played_at"))
        if parsed:
            played_at.append(parsed)
    return played_at


def _build_hour_pattern(played_at_values: list[datetime]) -> list:
    counts = [0] * 24
    for played_at in played_at_values:
        counts[played_at.hour] += 1

    return [
        {"hour": hour, "count": count}
        for hour, count in enumerate(counts)
        if count > 0
    ]


def _build_dow_pattern(played_at_values: list[datetime]) -> list:
    counts = [0] * 7
    for played_at in played_at_values:
        dow = (played_at.weekday() + 1) % 7  # Python Monday=0; chart expects Sunday=0.
        counts[dow] += 1

    return [
        {"dow": dow, "count": count}
        for dow, count in enumerate(counts)
        if count > 0
    ]


def get_patterns(user_id: str) -> dict:
    hours = _rpc("history_hour_pattern", {"p_user_id": user_id}) or []
    dow = _rpc("history_dow_pattern", {"p_user_id": user_id}) or []
    if hours and dow:
        return {"hours": hours, "dow": dow}

    played_at_values = _streaming_history_datetimes(user_id)
    return {
        "hours": hours or _build_hour_pattern(played_at_values),
        "dow": dow or _build_dow_pattern(played_at_values),
    }


def get_hour_pattern(user_id: str) -> list:
    rows = _rpc("history_hour_pattern", {"p_user_id": user_id}) or []
    if rows:
        return rows

    return _build_hour_pattern(_streaming_history_datetimes(user_id))


def get_dow_pattern(user_id: str) -> list:
    rows = _rpc("history_dow_pattern", {"p_user_id": user_id}) or []
    if rows:
        return rows

    return _build_dow_pattern(_streaming_history_datetimes(user_id))


def get_top_artists(user_id: str, year: Optional[int] = None, limit: int = 25) -> list:
    params = {"p_user_id": user_id, "p_year": year, "p_limit": limit}
    return _rpc("history_top_artists", params) or []


def get_top_tracks(user_id: str, year: Optional[int] = None, limit: int = 25, sp: Optional[spotipy.Spotify] = None) -> list:
    params = {"p_user_id": user_id, "p_year": year, "p_limit": limit}
    tracks = _rpc("history_top_tracks", params) or []
    _attach_album_art_from_saved_tracks(user_id, tracks)
    _attach_album_art_from_spotify(tracks, sp)
    return tracks


def _spotify_id_from_uri(uri: str) -> Optional[str]:
    if uri.startswith("spotify:track:"):
        return uri.replace("spotify:track:", "")
    return None


def _spotify_ids_for_track(track: dict) -> list[str]:
    uris = [track.get("spotify_track_uri") or ""]
    uris.extend(track.get("spotify_track_uris") or [])
    seen: set[str] = set()
    ids: list[str] = []
    for uri in uris:
        spotify_id = _spotify_id_from_uri(uri)
        if spotify_id and spotify_id not in seen:
            seen.add(spotify_id)
            ids.append(spotify_id)
    return ids


def _normalize_track_identity(track_name: str, artist_name: str) -> str:
    title = track_name.lower()
    title = re.sub(r"\s*-\s*(remaster(?:ed)?|mono|stereo|radio edit|single version|album version|explicit|clean|sped up|slowed|instrumental).*$", "", title)
    title = re.sub(r"\s*[\(\[]\s*(?:remaster(?:ed)?|mono|stereo|radio edit|single version|album version|explicit|clean|sped up|slowed|instrumental)[^\)\]]*[\)\]]", "", title)
    title = re.sub(r"\s+", " ", re.sub(r"[^a-z0-9]+", " ", title)).strip()
    artist = re.sub(r"\s+", " ", re.sub(r"[^a-z0-9]+", " ", artist_name.lower())).strip()
    return f"{artist}:{title or track_name.lower().strip()}"


def _attach_album_art_from_spotify(tracks: list, sp: Optional[spotipy.Spotify]) -> None:
    if not sp:
        return

    missing_ids = [
        spotify_id
        for track in tracks
        if not track.get("album_art_url")
        for spotify_id in _spotify_ids_for_track(track)
    ]
    if not missing_ids:
        return

    try:
        for i in range(0, len(missing_ids), 50):
            response = sp.tracks(missing_ids[i:i + 50])
            for track in response.get("tracks") or []:
                if not track:
                    continue
                images = track.get("album", {}).get("images") or []
                if not images:
                    continue
                album_art_url = images[0].get("url")
                track_uri = f"spotify:track:{track.get('id')}"
                for item in tracks:
                    if track_uri in [item.get("spotify_track_uri"), *(item.get("spotify_track_uris") or [])]:
                        item["album_art_url"] = album_art_url
    except Exception as exc:
        print(f"Could not enrich history tracks with Spotify artwork: {exc}")


def _attach_album_art_from_saved_tracks(user_id: str, tracks: list) -> None:
    spotify_ids = [
        spotify_id
        for track in tracks
        if not track.get("album_art_url")
        for spotify_id in _spotify_ids_for_track(track)
    ]
    if not spotify_ids:
        return

    art_result = (
        supabase.table("top_tracks")
        .select("spotify_track_id, album_art_url")
        .eq("user_id", user_id)
        .in_("spotify_track_id", spotify_ids)
        .execute()
    )
    art_by_id = {
        row["spotify_track_id"]: row.get("album_art_url")
        for row in art_result.data or []
        if row.get("album_art_url")
    }
    for track in tracks:
        for spotify_id in _spotify_ids_for_track(track):
            if spotify_id in art_by_id:
                track["album_art_url"] = art_by_id[spotify_id]
                break


def get_artist_top_tracks(user_id: str, artist_name: str, limit: int = 25, sp: Optional[spotipy.Spotify] = None) -> list:
    result = (
        supabase.table("streaming_history")
        .select("track_name, artist_name, spotify_track_uri, ms_played")
        .eq("user_id", user_id)
        .ilike("artist_name", artist_name)
        .limit(50000)
        .execute()
    )

    tracks: dict[str, dict] = {}
    for row in result.data or []:
        track_name = row.get("track_name") or "Unknown Track"
        artist = row.get("artist_name") or artist_name
        uri = row.get("spotify_track_uri") or f"{artist}:{track_name}"
        key = _normalize_track_identity(track_name, artist)
        if key not in tracks:
            tracks[key] = {
                "track_name": track_name,
                "artist_name": artist,
                "spotify_track_uri": uri,
                "spotify_track_uris": [],
                "plays": 0,
                "total_ms": 0,
                "album_art_url": None,
            }
        if uri.startswith("spotify:track:") and uri not in tracks[key]["spotify_track_uris"]:
            tracks[key]["spotify_track_uris"].append(uri)
        if (row.get("ms_played") or 0) > tracks[key].get("_display_ms", 0):
            tracks[key]["track_name"] = track_name
            tracks[key]["artist_name"] = artist
            tracks[key]["spotify_track_uri"] = uri
            tracks[key]["_display_ms"] = row.get("ms_played") or 0
        tracks[key]["plays"] += 1
        tracks[key]["total_ms"] += row.get("ms_played") or 0

    sorted_tracks = sorted(
        tracks.values(),
        key=lambda track: (track["total_ms"], track["plays"]),
        reverse=True,
    )[:limit]
    for track in sorted_tracks:
        track.pop("_display_ms", None)

    _attach_album_art_from_saved_tracks(user_id, sorted_tracks)
    _attach_album_art_from_spotify(sorted_tracks, sp)

    return sorted_tracks


def get_artist_yearly(user_id: str, artist_names: Optional[list[str]] = None, limit: int = 8) -> list:
    selected_names = []
    seen_names: set[str] = set()
    for name in artist_names or []:
        clean_name = name.strip()
        key = clean_name.lower()
        if clean_name and key not in seen_names:
            selected_names.append(clean_name)
            seen_names.add(key)

    if not selected_names:
        selected_names = [
            row["artist_name"]
            for row in get_top_artists(user_id, limit=limit)
            if row.get("artist_name")
        ]

    if selected_names:
        selected_names = selected_names[:limit]

    rows: list[dict] = []
    offset = 0
    while True:
        query = (
            supabase.table("streaming_history")
            .select("played_at, ms_played, track_name, artist_name")
            .eq("user_id", user_id)
            .order("played_at")
        )
        if selected_names:
            query = query.in_("artist_name", selected_names)

        result = query.range(offset, offset + HISTORY_FETCH_PAGE_SIZE - 1).execute()
        batch = result.data or []
        rows.extend(batch)

        if len(batch) < HISTORY_FETCH_PAGE_SIZE:
            break
        offset += HISTORY_FETCH_PAGE_SIZE

    yearly: dict[tuple[str, int], dict] = {}
    totals: dict[str, int] = {}
    display_names: dict[str, str] = {}

    for row in rows:
        artist_name = row.get("artist_name")
        if not artist_name or not row.get("track_name"):
            continue

        parsed = _parse_played_at(row.get("played_at"))
        if not parsed:
            continue

        artist_key = artist_name.lower()
        display_names.setdefault(artist_key, artist_name)
        ms_played = row.get("ms_played") or 0
        totals[artist_key] = totals.get(artist_key, 0) + ms_played

        key = (artist_key, parsed.year)
        if key not in yearly:
            yearly[key] = {
                "artist_name": artist_name,
                "year": parsed.year,
                "plays": 0,
                "total_ms": 0,
            }
        yearly[key]["plays"] += 1
        yearly[key]["total_ms"] += ms_played

    allowed = {
        artist_key
        for artist_key, _total_ms in sorted(totals.items(), key=lambda item: item[1], reverse=True)[:limit]
    }
    if selected_names:
        allowed.update(name.lower() for name in selected_names)

    return sorted(
        [
            {**row, "artist_name": display_names.get(row["artist_name"].lower(), row["artist_name"])}
            for (artist_key, _year), row in yearly.items()
            if artist_key in allowed
        ],
        key=lambda row: (row["year"], row["artist_name"]),
    )
