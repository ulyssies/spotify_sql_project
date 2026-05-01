from fastapi import APIRouter, Depends, HTTPException

from app.auth.session import get_current_user
from app.auth.spotify import get_spotify_client_for_user
from app.recommendations import service

router = APIRouter(prefix="/recommendations", tags=["recommendations"])


@router.get("/")
async def get_recommendations(
    user: dict = Depends(get_current_user),
):
    """
    Return up to 5 filtered song recommendations seeded from the user's
    medium-term top tracks and long-term top artists.

    Filters out tracks the user already knows (all stored top tracks across
    all time ranges + 50 recently played). Returns 404 with 'no_new_tracks'
    if no unseen tracks can be found.
    """
    sp = get_spotify_client_for_user(user)
    results = service.get_recommendations(sp=sp, user_id=user["id"])
    if results is None:
        raise HTTPException(status_code=404, detail="no_new_tracks")
    return results
