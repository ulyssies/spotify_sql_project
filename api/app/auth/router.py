from datetime import datetime, timezone

import spotipy
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse

from app.auth.session import create_session_token, get_current_user
from app.auth.spotify import get_oauth_handler
from app.config import settings
from app.database import supabase

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/login")
async def login():
    """Redirect the user to the Spotify OAuth authorization page."""
    auth_url = get_oauth_handler().get_authorize_url()
    return RedirectResponse(url=auth_url)


@router.get("/callback")
async def callback(code: str):
    """
    Handle the Spotify OAuth callback.

    Exchanges the authorization code for tokens, upserts the user in Supabase,
    and redirects to the frontend with a signed JWT in the query string.

    Args:
        code: Authorization code provided by Spotify.
    """
    auth_manager = get_oauth_handler()

    try:
        token_info = auth_manager.get_access_token(code)
    except Exception:
        raise HTTPException(status_code=400, detail="Failed to exchange authorization code")

    sp = spotipy.Spotify(auth=token_info["access_token"])
    profile = sp.current_user()

    spotify_id = profile["id"]
    token_expires_at = datetime.fromtimestamp(
        token_info["expires_at"], tz=timezone.utc
    ).isoformat()

    images = profile.get("images") or []
    avatar_url = images[0]["url"] if images else None

    result = supabase.table("users").upsert(
        {
            "spotify_id": spotify_id,
            "display_name": profile.get("display_name", ""),
            "email": profile.get("email", ""),
            "avatar_url": avatar_url,
            "refresh_token": token_info["refresh_token"],
            "token_expires_at": token_expires_at,
        },
        on_conflict="spotify_id",
    ).execute()

    user = result.data[0]
    session_token = create_session_token(spotify_id=spotify_id, user_id=user["id"])

    return RedirectResponse(url=f"{settings.frontend_url}/auth/callback?token={session_token}")


@router.post("/logout")
async def logout(_: dict = Depends(get_current_user)):
    """
    Invalidate the current session.

    Tokens are stateless JWTs — logout is handled client-side by discarding
    the token. This endpoint exists as a clean hook for future blocklist logic.
    """
    return {"message": "Logged out — discard your token on the client"}
