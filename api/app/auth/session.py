from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from app.config import settings
from app.database import supabase

ALGORITHM = "HS256"
TOKEN_EXPIRE_HOURS = 24 * 7  # 7 days

bearer_scheme = HTTPBearer()


def create_session_token(spotify_id: str, user_id: str) -> str:
    """
    Create a signed JWT for a user session.

    Args:
        spotify_id: The user's Spotify account ID.
        user_id: The user's UUID in Supabase.

    Returns:
        Signed HS256 JWT string.
    """
    payload = {
        "sub": spotify_id,
        "user_id": user_id,
        "exp": datetime.now(tz=timezone.utc) + timedelta(hours=TOKEN_EXPIRE_HOURS),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=ALGORITHM)


def decode_session_token(token: str) -> dict:
    """
    Decode and verify a signed JWT.

    Args:
        token: JWT string from the Authorization header.

    Returns:
        Decoded payload dict.

    Raises:
        HTTPException: 401 if the token is invalid or expired.
    """
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> dict:
    """
    FastAPI dependency that verifies the Bearer JWT and returns the user row.

    Args:
        credentials: Bearer token extracted from the Authorization header.

    Returns:
        Full user row dict from Supabase.

    Raises:
        HTTPException: 401 if the token is invalid or the user no longer exists.
    """
    payload = decode_session_token(credentials.credentials)
    user_id = payload.get("user_id")

    result = (
        supabase.table("users")
        .select("*")
        .eq("id", user_id)
        .maybe_single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=401, detail="User not found")

    return result.data
