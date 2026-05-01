from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class StreamingHistoryItemIn(BaseModel):
    ts: str
    ms_played: int
    master_metadata_track_name: str
    master_metadata_album_artist_name: str
    master_metadata_album_album_name: Optional[str] = None
    spotify_track_uri: str
    reason_start: Optional[str] = None
    reason_end: Optional[str] = None
    skipped: Optional[bool] = None


class ImportResult(BaseModel):
    imported: int
    duplicates_skipped: int


class DateRange(BaseModel):
    from_: str
    to: str

    class Config:
        populate_by_name = True
        fields = {"from_": "from"}


class ImportStatus(BaseModel):
    total_streams: int
    date_range: dict
    last_import: datetime
