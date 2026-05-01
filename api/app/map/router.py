from fastapi import APIRouter, Depends, HTTPException, Query

from app.auth.session import get_current_user
from app.map import service

router = APIRouter(prefix="/map", tags=["map"])

VALID_RANGES = {"short_term", "medium_term", "long_term"}


def _validate_range(range: str) -> None:
    if range not in VALID_RANGES:
        raise HTTPException(status_code=400, detail=f"range must be one of {VALID_RANGES}")


@router.get("/genres")
async def get_genre_map(
    range: str = Query("short_term"),
    user: dict = Depends(get_current_user),
):
    _validate_range(range)
    return service.get_genre_map(user_id=user["id"], time_range=range)


@router.get("/artists")
async def get_artist_map(
    range: str = Query("short_term"),
    user: dict = Depends(get_current_user),
):
    _validate_range(range)
    return service.get_artist_map(user_id=user["id"], time_range=range)
