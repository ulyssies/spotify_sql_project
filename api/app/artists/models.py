from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


class ArtistOut(BaseModel):
    id: Optional[str] = None
    spotify_artist_id: str
    artist_name: str
    artist_image_url: Optional[str] = None
    genres: Optional[List[str]] = None
    popularity: Optional[int] = None
    followers: Optional[int] = None
    time_range: Optional[str] = None
    rank: int
    snapshot_at: Optional[datetime] = None
    total_plays: Optional[int] = None
    total_minutes: Optional[int] = None


class ArtistSyncResult(BaseModel):
    synced: int
    time_range: str
