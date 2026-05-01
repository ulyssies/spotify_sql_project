from datetime import datetime, date
from typing import List, Optional

from pydantic import BaseModel


class TrackOut(BaseModel):
    id: Optional[str] = None
    spotify_track_id: str
    track_name: str
    artist_name: str
    album_name: Optional[str] = None
    album_art_url: Optional[str] = None
    popularity: Optional[int] = None
    time_range: Optional[str] = None
    rank: int
    genres: Optional[List[str]] = None
    snapshot_at: Optional[datetime] = None
    play_count: Optional[int] = None
    minutes_played: Optional[int] = None
    first_listened: Optional[str] = None


class SyncResult(BaseModel):
    synced: int
    time_range: str
