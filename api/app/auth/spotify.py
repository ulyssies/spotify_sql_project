from datetime import datetime, timezone

import spotipy
from spotipy.cache_handler import MemoryCacheHandler
from spotipy.oauth2 import SpotifyOAuth

from app.config import settings
from app.database import supabase

SCOPES = "user-top-read user-read-recently-played user-read-private user-read-email"


def get_oauth_handler() -> SpotifyOAuth:
    """Return a SpotifyOAuth handler with no on-disk token cache."""
    return SpotifyOAuth(
        client_id=settings.spotify_client_id,
        client_secret=settings.spotify_client_secret,
        redirect_uri=settings.spotify_redirect_uri,
        scope=SCOPES,
        cache_handler=MemoryCacheHandler(),
        open_browser=False,
    )


def get_spotify_client_for_user(user: dict) -> spotipy.Spotify:
    """
    Return an authenticated Spotipy client for a given user.

    Exchanges the stored refresh token for a fresh access token. Updates
    the DB with the new expiry (and new refresh token if Spotify rotated it).

    Args:
        user: User row dict from Supabase — must include 'id' and 'refresh_token'.

    Returns:
        Authenticated spotipy.Spotify instance.

    Raises:
        ValueError: If the user row has no refresh token.
    """
    refresh_token = user.get("refresh_token")
    if not refresh_token:
        raise ValueError(f"User {user['id']} has no refresh token stored")

    auth_manager = get_oauth_handler()
    token_info = auth_manager.refresh_access_token(refresh_token)

    update_data: dict = {
        "token_expires_at": datetime.fromtimestamp(
            token_info["expires_at"], tz=timezone.utc
        ).isoformat(),
    }
    # Spotify occasionally rotates the refresh token — persist the new one
    new_refresh = token_info.get("refresh_token")
    if new_refresh and new_refresh != refresh_token:
        update_data["refresh_token"] = new_refresh

    supabase.table("users").update(update_data).eq("id", user["id"]).execute()

    return spotipy.Spotify(auth=token_info["access_token"])
