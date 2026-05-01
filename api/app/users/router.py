from fastapi import APIRouter, Depends

from app.auth.session import get_current_user
from app.users.models import UserOut

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserOut)
async def get_me(user: dict = Depends(get_current_user)):
    """Return the authenticated user's profile."""
    return user
