from fastapi import APIRouter, Depends

from app.auth.session import get_current_user
from app.auth.spotify import get_spotify_client_for_user
from app.recommendations import service

router = APIRouter(prefix="/recommendations", tags=["recommendations"])


@router.get("/")
async def get_recommendations(
    user: dict = Depends(get_current_user),
):
    """
    Return popular low-exposure songs seeded from the user's all-time graph.

    Candidates are filtered so their imported all-time listening total stays
    below one hour.
    """
    sp = get_spotify_client_for_user(user)
    return service.get_recommendations(sp=sp, user_id=user["id"])
