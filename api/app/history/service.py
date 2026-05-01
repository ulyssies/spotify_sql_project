from typing import Optional

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


def get_top_tracks(user_id: str, year: Optional[int] = None, limit: int = 25) -> list:
    params = {"p_user_id": user_id, "p_year": year, "p_limit": limit}
    return _rpc("history_top_tracks", params) or []
