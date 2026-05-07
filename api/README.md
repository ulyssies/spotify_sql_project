# SpotYourVibe API

FastAPI backend for SpotYourVibe. It handles Spotify OAuth, token refresh, per-user Supabase storage, top track/artist sync, streaming history import, graph data, history analytics, and the experimental recommendations surface.

---

## Setup

```bash
cd api
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Fill `.env` with backend-only secrets. Do not expose service-role keys or Spotify client secrets to the frontend.

| Variable | Description |
|---|---|
| `SPOTIFY_CLIENT_ID` | Spotify Developer Dashboard client ID |
| `SPOTIFY_CLIENT_SECRET` | Spotify Developer Dashboard client secret |
| `SPOTIFY_REDIRECT_URI` | Local default: `http://127.0.0.1:8000/api/v1/auth/callback` |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Supabase service role key, backend only |
| `JWT_SECRET` | Random secret for signing app session JWTs |
| `FRONTEND_URL` | Local default: `http://localhost:3000` |
| `LASTFM_API_KEY` | Optional fallback for genre enrichment scripts |

## Database

Run the base schema in Supabase:

```text
api/supabase/schema.sql
```

Then apply migrations in:

```text
api/migrations/
```

The current history migration enriches `streaming_history` with `reason_start`, `reason_end`, `skipped`, `shuffle`, generated Spotify track IDs, and analytics RPC helpers for yearly, monthly, heatmap, pattern, and top-list queries.

## Run

```bash
python3 -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Interactive docs:

```text
http://127.0.0.1:8000/docs
```

---

## API Reference

All routes are prefixed with `/api/v1`. Protected routes require:

```text
Authorization: Bearer <jwt>
```

### Auth

| Method | Route | Description |
|---|---|---|
| `GET` | `/auth/login` | Redirect to Spotify OAuth |
| `GET` | `/auth/callback?code=...` | Exchange code, upsert user, redirect with JWT |
| `POST` | `/auth/logout` | Stateless client-side token discard |

### Users

| Method | Route | Description |
|---|---|---|
| `GET` | `/users/me` | Current user profile |

### Tracks

| Method | Route | Description |
|---|---|---|
| `POST` | `/tracks/sync?range=short_term` | Pull Spotify top tracks and store them |
| `GET` | `/tracks/?range=short_term` | Read stored top tracks enriched with imported history stats when available |

`range` accepts `short_term`, `medium_term`, and `long_term`.

### Artists

| Method | Route | Description |
|---|---|---|
| `POST` | `/artists/sync?range=short_term` | Pull Spotify top artists and store metadata |
| `GET` | `/artists/?range=short_term` | Read stored top artists enriched with imported listening totals when available |

### Genres

| Method | Route | Description |
|---|---|---|
| `GET` | `/genres/?range=short_term` | Genre percentages, preferring imported history weighting when available |

### Map

| Method | Route | Description |
|---|---|---|
| `GET` | `/map/genres?range=long_term` | Parent genre, subgenre, artist, and link data for the Music Map |
| `GET` | `/map/artists?range=long_term` | Artist-web graph data |

### Import

| Method | Route | Description |
|---|---|---|
| `POST` | `/import/streaming-history` | Import Spotify Extended Streaming History JSON rows |
| `GET` | `/import/status` | Return imported stream counts and date range |

The importer now upserts rows so re-imports can backfill metadata. It preserves short plays, skipped rows, shuffle, and reason fields rather than filtering them out at upload time.

### History

| Method | Route | Description |
|---|---|---|
| `GET` | `/history/stats` | All-time listening stats |
| `GET` | `/history/stats?year=2025` | Year-scoped listening stats |
| `GET` | `/history/yearly` | Hours/plays/artists/tracks by year |
| `GET` | `/history/monthly?year=2025` | Month-by-month stats for one year |
| `GET` | `/history/heatmap?year=2025` | Calendar heatmap rows |
| `GET` | `/history/patterns` | Hour-of-day and day-of-week listening patterns |
| `GET` | `/history/top-artists?year=2025&limit=25` | Top artists by imported history |
| `GET` | `/history/top-tracks?year=2025&limit=25` | Top tracks by imported history with artwork enrichment |
| `GET` | `/history/artist-top-tracks?artist_name=Drake` | Deduplicated all-time songs for one artist |
| `GET` | `/history/artist-yearly?artist_names=Drake&artist_names=Radiohead` | Yearly listening buckets for selected artists |

### Recommendations

| Method | Route | Description |
|---|---|---|
| `GET` | `/recommendations/` | Experimental recommendations surface |

Spotify deprecated several recommendation and related-artist APIs for many apps after November 2024. Treat this route as experimental until it is rebuilt around local graph/history ranking.

---

## Import CLI

For local history import:

```bash
python3 scripts/import_history.py --dir "/path/to/Spotify Extended Streaming History"
```

The script upserts rows and can backfill `reason_start`, `reason_end`, `skipped`, and `shuffle` metadata when those fields exist in the Spotify export.
