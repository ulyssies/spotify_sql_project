from typing import Optional

from fastapi import APIRouter, Depends, Query

from app.auth.session import get_current_user
from app.auth.spotify import get_spotify_client_for_user
from app.history import service

router = APIRouter(prefix="/history", tags=["history"])


@router.get("/stats")
async def get_stats(user: dict = Depends(get_current_user)):
    return service.get_stats(user["id"])


@router.get("/yearly")
async def get_yearly(user: dict = Depends(get_current_user)):
    return service.get_yearly(user["id"])


@router.get("/heatmap")
async def get_heatmap(
    year: Optional[int] = Query(None),
    user: dict = Depends(get_current_user),
):
    return service.get_heatmap(user["id"], year=year)


@router.get("/patterns")
async def get_patterns(user: dict = Depends(get_current_user)):
    hours = service.get_hour_pattern(user["id"])
    dow = service.get_dow_pattern(user["id"])
    return {"hours": hours, "dow": dow}


@router.get("/top-artists")
async def get_top_artists(
    year: Optional[int] = Query(None),
    limit: int = Query(25, ge=1, le=100),
    user: dict = Depends(get_current_user),
):
    return service.get_top_artists(user["id"], year=year, limit=limit)


@router.get("/top-tracks")
async def get_top_tracks(
    year: Optional[int] = Query(None),
    limit: int = Query(25, ge=1, le=100),
    user: dict = Depends(get_current_user),
):
    sp = get_spotify_client_for_user(user)
    return service.get_top_tracks(user["id"], year=year, limit=limit, sp=sp)


@router.get("/artist-top-tracks")
async def get_artist_top_tracks(
    artist_name: str = Query(..., min_length=1),
    limit: int = Query(25, ge=1, le=100),
    user: dict = Depends(get_current_user),
):
    sp = get_spotify_client_for_user(user)
    return service.get_artist_top_tracks(user["id"], artist_name=artist_name, limit=limit, sp=sp)
