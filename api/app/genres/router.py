from fastapi import APIRouter, Depends, HTTPException, Query

from app.auth.session import get_current_user
from app.genres import service

router = APIRouter(prefix="/genres", tags=["genres"])

VALID_RANGES = {"short_term", "medium_term", "long_term"}


@router.get("/")
async def get_genres(
    range: str = Query("short_term"),
    user: dict = Depends(get_current_user),
):
    """
    Return genre distribution percentages for the current user and time range.

    Data is read from genre_snapshots — run POST /tracks/sync first to populate it.
    Results are ordered by percentage descending.
    """
    if range not in VALID_RANGES:
        raise HTTPException(status_code=400, detail=f"range must be one of {VALID_RANGES}")
    return service.get_genre_distribution(user_id=user["id"], time_range=range)
