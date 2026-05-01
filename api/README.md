# SpotYourVibe API

FastAPI backend for SpotYourVibe. Handles Spotify OAuth, per-user data storage in Supabase, and the tracks/genres/recommendations ETL pipeline.

---

## Setup

```bash
cd spotyourvibe-api
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in all values
```

### Environment variables

| Variable | Description |
|---|---|
| `SPOTIFY_CLIENT_ID` | From Spotify Developer Dashboard |
| `SPOTIFY_CLIENT_SECRET` | From Spotify Developer Dashboard |
| `SPOTIFY_REDIRECT_URI` | Must match Dashboard exactly — `http://localhost:8000/api/v1/auth/callback` for local |
| `SUPABASE_URL` | Project URL from Supabase dashboard |
| `SUPABASE_SERVICE_KEY` | Service role key (bypasses RLS) — never expose to client |
| `JWT_SECRET` | Random secret for signing session JWTs — generate with `openssl rand -hex 32` |
| `FRONTEND_URL` | Origin allowed by CORS — `http://localhost:3000` for local dev |

### Database

Run `supabase/schema.sql` once in the Supabase SQL editor (or via `supabase db reset`).

### Run

```bash
uvicorn app.main:app --reload --port 8000
```

Interactive docs: http://localhost:8000/docs

---

## API Reference

All routes are prefixed `/api/v1`. Protected routes require:
```
Authorization: Bearer <jwt>
```

### Auth

| Method | Route | Description |
|---|---|---|
| `GET` | `/auth/login` | Redirect to Spotify OAuth |
| `GET` | `/auth/callback?code=...` | Exchange code, set JWT, redirect to frontend |
| `POST` | `/auth/logout` | Client-side token discard (stateless) |

### Users

| Method | Route | Description |
|---|---|---|
| `GET` | `/users/me` | Current user profile |

### Tracks

| Method | Route | Description |
|---|---|---|
| `POST` | `/tracks/sync?range=short_term` | Run ETL — pull from Spotify and store |
| `GET` | `/tracks/?range=short_term` | Read stored top tracks |

`range` accepts: `short_term` · `medium_term` · `long_term`

### Genres

| Method | Route | Description |
|---|---|---|
| `GET` | `/genres/?range=short_term` | Genre percentages (pre-calculated by ETL) |

### Recommendations

| Method | Route | Description |
|---|---|---|
| `GET` | `/recommendations/?range=short_term` | 5 filtered recommendations (requires sync first) |

---

## Auth Flow

```
Client → GET /api/v1/auth/login
       → 302 → accounts.spotify.com/authorize
       → user approves
       → GET /api/v1/auth/callback?code=...
       → upsert user in Supabase
       → 302 → {FRONTEND_URL}?token=<jwt>

Client stores JWT, sends as:
  Authorization: Bearer <jwt>
```

---

## Data Flow

```
POST /tracks/sync
  → Spotify: current_user_top_tracks (25 tracks)
  → Spotify: artist genres per track
  → Supabase: delete old rows for user + range
  → Supabase: insert fresh top_tracks rows
  → Supabase: recalculate + replace genre_snapshots rows
  → Supabase: update users.last_synced_at

GET /recommendations
  → Supabase: top 5 stored track IDs (seeds)
  → Spotify: top 5 artist IDs (seeds)
  → Spotify: recently played (50 tracks → seen_ids)
  → Spotify: recommendations(seed_tracks=2, seed_artists=3, limit=20)
  → filter: remove any track in seen_ids
  → return first 5
```
