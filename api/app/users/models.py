from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class UserOut(BaseModel):
    id: str
    spotify_id: str
    display_name: Optional[str]
    email: Optional[str]
    avatar_url: Optional[str]
    created_at: datetime
    last_synced_at: Optional[datetime]
    token_expires_at: Optional[datetime]
