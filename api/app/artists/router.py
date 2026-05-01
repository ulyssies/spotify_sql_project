from fastapi import APIRouter, Depends, HTTPException, Query

from app.auth.session import get_current_user
from app.auth.spotify import get_spotify_client_for_user
from app.artists import service
from app.artists.models import ArtistOut, ArtistSyncResult

router = APIRouter(prefix="/artists", tags=["artists"])

VALID_RANGES = {"short_term", "medium_term", "long_term"}


def _validate_range(range: str) -> None:
    if range not in VALID_RANGES:
        raise HTTPException(status_code=400, detail=f"range must be one of {VALID_RANGES}")


@router.post("/sync", response_model=ArtistSyncResult)
async def sync_artists(
    range: str = Query("short_term"),
    user: dict = Depends(get_current_user),
):
    """Sync top artists for the current user and time range."""
    _validate_range(range)
    sp = get_spotify_client_for_user(user)
    artists = service.sync_top_artists(sp=sp, user_id=user["id"], time_range=range)
    return {"synced": len(artists), "time_range": range}


@router.get("/", response_model=list[ArtistOut])
async def get_artists(
    range: str = Query("short_term"),
    user: dict = Depends(get_current_user),
):
    """Return stored top artists for the current user and time range."""
    _validate_range(range)
    return service.get_top_artists(user_id=user["id"], time_range=range)
