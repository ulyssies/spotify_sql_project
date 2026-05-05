import re
from typing import Optional

import spotipy

from app.database import supabase


def _rpc(fn: str, params: dict):
    result = supabase.rpc(fn, params).execute()
    return result.data


def get_stats(user_id: str) -> dict:
    return _rpc("history_stats", {"p_user_id": user_id}) or {}


def get_yearly(user_id: str) -> list:
    return _rpc("history_yearly", {"p_user_id": user_id}) or []


def get_heatmap(user_id: str, year: Optional[int] = None) -> list:
    params = {"p_user_id": user_id, "p_year": year}
    return _rpc("history_heatmap", params) or []


def get_hour_pattern(user_id: str) -> list:
    return _rpc("history_hour_pattern", {"p_user_id": user_id}) or []


def get_dow_pattern(user_id: str) -> list:
    return _rpc("history_dow_pattern", {"p_user_id": user_id}) or []


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
