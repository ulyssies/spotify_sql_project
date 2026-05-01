from fastapi import APIRouter, Depends, HTTPException, Query

from app.auth.session import get_current_user
from app.auth.spotify import get_spotify_client_for_user
from app.tracks import service
from app.tracks.models import SyncResult, TrackOut

router = APIRouter(prefix="/tracks", tags=["tracks"])

VALID_RANGES = {"short_term", "medium_term", "long_term"}


def _validate_range(range: str) -> None:
    if range not in VALID_RANGES:
        raise HTTPException(status_code=400, detail=f"range must be one of {VALID_RANGES}")


@router.post("/sync", response_model=SyncResult)
async def sync_tracks(
    range: str = Query("short_term"),
    user: dict = Depends(get_current_user),
):
    """Trigger ETL for the current user's top tracks for the given time range."""
    _validate_range(range)
    sp = get_spotify_client_for_user(user)
    tracks = service.sync_top_tracks(sp=sp, user_id=user["id"], time_range=range)
    return {"synced": len(tracks), "time_range": range}


@router.get("/", response_model=list[TrackOut])
async def get_tracks(
    range: str = Query("short_term"),
    user: dict = Depends(get_current_user),
):
    """Return stored top tracks for the current user and time range, ordered by rank."""
    _validate_range(range)
    sp = get_spotify_client_for_user(user)
    return service.get_top_tracks(user_id=user["id"], time_range=range, sp=sp)
