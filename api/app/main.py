from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.auth.router import router as auth_router
from app.users.router import router as users_router
from app.tracks.router import router as tracks_router
from app.recommendations.router import router as recommendations_router
from app.genres.router import router as genres_router
from app.import_.router import router as import_router
from app.artists.router import router as artists_router

app = FastAPI(title="SpotYourVibe API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

API_PREFIX = "/api/v1"

app.include_router(auth_router, prefix=API_PREFIX)
app.include_router(users_router, prefix=API_PREFIX)
app.include_router(tracks_router, prefix=API_PREFIX)
app.include_router(recommendations_router, prefix=API_PREFIX)
app.include_router(genres_router, prefix=API_PREFIX)
app.include_router(import_router, prefix=API_PREFIX)
app.include_router(artists_router, prefix=API_PREFIX)


@app.get("/health")
async def health():
    return {"status": "ok"}
