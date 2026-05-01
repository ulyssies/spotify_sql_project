from typing import List, Optional

from fastapi import APIRouter, Depends

from app.auth.session import get_current_user
from app.import_.models import ImportResult, ImportStatus, StreamingHistoryItemIn
from app.import_ import service

router = APIRouter(prefix="/import", tags=["import"])


@router.post("/streaming-history", response_model=ImportResult)
async def import_streaming_history(
    items: List[StreamingHistoryItemIn],
    user: dict = Depends(get_current_user),
):
    """Upsert pre-filtered streaming history rows for the current user."""
    result = service.upsert_streaming_history(user_id=user["id"], items=items)
    return result


@router.get("/status", response_model=Optional[ImportStatus])
async def get_import_status(
    user: dict = Depends(get_current_user),
):
    """Return streaming history summary for the current user, or null if none exists."""
    return service.get_import_status(user_id=user["id"])
