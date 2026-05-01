from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


class ArtistOut(BaseModel):
    id: str
    spotify_artist_id: str
    artist_name: str
    artist_image_url: Optional[str]
    genres: Optional[List[str]]
    popularity: Optional[int]
    followers: Optional[int]
    time_range: str
    rank: int
    snapshot_at: datetime


class ArtistSyncResult(BaseModel):
    synced: int
    time_range: str
