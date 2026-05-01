from datetime import datetime, date
from typing import List, Optional

from pydantic import BaseModel


class TrackOut(BaseModel):
    id: str
    spotify_track_id: str
    track_name: str
    artist_name: str
    album_name: Optional[str]
    album_art_url: Optional[str]
    popularity: Optional[int]
    time_range: str
    rank: int
    genres: Optional[List[str]]
    snapshot_at: datetime
    play_count: Optional[int] = None
    minutes_played: Optional[int] = None
    first_listened: Optional[str] = None


class SyncResult(BaseModel):
    synced: int
    time_range: str
