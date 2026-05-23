from fastapi import APIRouter, Depends

from app.auth.session import get_current_user
from app.database import supabase
from app.users.models import UserOut

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserOut)
async def get_me(user: dict = Depends(get_current_user)):
    """Return the authenticated user's profile."""
    return user


@router.delete("/me")
async def delete_me(user: dict = Depends(get_current_user)):
    """
    Delete the authenticated user and all rows linked through ON DELETE CASCADE.

    The schema cascades top tracks, artists, genre snapshots, and streaming history
    from the users table, so this is the single account/data deletion path.
    """
    supabase.table("users").delete().eq("id", user["id"]).execute()
    return {"message": "User data deleted"}
