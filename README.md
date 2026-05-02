<div align="center">

# SpotYourVibe

**A full-stack Spotify statistics dashboard that turns your listening history into interactive insights.**

[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Next.js%2014-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-22c55e?style=for-the-badge)](LICENSE)

</div>

---

## Overview

SpotYourVibe connects to your Spotify account via OAuth and surfaces your listening data across three time windows: last 4 weeks, last 6 months, and all time. It runs a per-user ETL pipeline on demand — pulling data from the Spotify Web API, enriching it with artist and genre metadata from both Spotify and Last.fm, and persisting it in Supabase for fast querying. The frontend is a Next.js 14 App Router application with a collapsible sidebar, responsive grid layouts, and SWR-powered data fetching.

---

## Features

| Feature | Description |
|---|---|
| **Top Tracks** | Your top 50 tracks ranked by real play counts from imported history, with album art and listen time stats |
| **Top Artists** | Your top 50 artists ranked by total minutes played, with portrait, genre tags, and follower count |
| **Genre Insights** | Bar chart of genre distribution weighted by ms_played from streaming history, color-coded by genre family. Minor genres collapsible on demand |
| **Recommendations** | Personalized track suggestions sourced from related artists, filtered against your full listening history |
| **Streaming History Import** | Bulk import of Spotify Extended Streaming History JSON exports — 276k+ rows supported |
| **Live Sync** | On-demand sync per time range — replaces stale rows atomically with the latest Spotify data |

---

## Architecture

```
spotify_sql_project/
├── api/                        # FastAPI backend
│   ├── app/
│   │   ├── auth/               # Spotify OAuth + JWT session management
│   │   ├── users/              # User profile and sync metadata
│   │   ├── tracks/             # Top tracks ETL and read endpoints
│   │   ├── artists/            # Top artists ETL and read endpoints
│   │   ├── genres/             # Genre distribution from streaming history
│   │   ├── recommendations/    # Related-artists recommendation pipeline
│   │   └── history/            # Streaming history endpoints and stats
│   ├── scripts/
│   │   ├── import_history.py         # Bulk import Spotify JSON exports
│   │   ├── enrich_artist_genres.py   # Spotify genre enrichment via track URIs
│   │   ├── enrich_lastfm_genres.py   # Last.fm fallback for empty Spotify genres
│   │   └── clean_genre_tags.py       # Strip geographic/demographic noise tags
│   ├── supabase/
│   │   └── schema.sql          # Full Supabase schema with RLS
│   └── requirements.txt
└── web/                        # Next.js 14 frontend
    ├── app/                    # App Router pages and layouts
    ├── components/             # UI components (tracks, artists, genres, layout)
    ├── hooks/                  # SWR data hooks
    └── lib/                    # API client, auth utilities, shared types
```

---

## Tech Stack

**Backend**

[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com)
[![Spotipy](https://img.shields.io/badge/Spotipy-1DB954?style=flat-square&logo=spotify&logoColor=white)](https://github.com/plamere/spotipy)
[![Pydantic](https://img.shields.io/badge/Pydantic-E92063?style=flat-square&logo=pydantic&logoColor=white)](https://docs.pydantic.dev)

**Frontend**

[![Next.js](https://img.shields.io/badge/Next.js%2014-000000?style=flat-square&logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Recharts](https://img.shields.io/badge/Recharts-22C55E?style=flat-square)](https://recharts.org)

---

## Getting Started

### Prerequisites

- Python 3.9+
- Node.js 18+
- A [Supabase](https://supabase.com) project
- A [Spotify Developer](https://developer.spotify.com/dashboard) app with OAuth credentials
- A [Last.fm API key](https://www.last.fm/api/account/create) (free — used for genre fallback enrichment)

---

### 1. Clone the repository

```bash
git clone https://github.com/ulyssies/spotify-visualizer.git
cd spotify-visualizer
```

---

### 2. Set up the database

Run `api/supabase/schema.sql` in the Supabase SQL editor, then run the enrichment migration:

```bash
# api/migrations/003_streaming_history_enrich.sql
# Run in the Supabase SQL editor after schema.sql
```

---

### 3. Configure and run the API

```bash
cd api
python3 -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
```

Edit `.env`:

```env
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
SPOTIFY_REDIRECT_URI=http://localhost:3000/auth/callback
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key
JWT_SECRET=a_long_random_secret
FRONTEND_URL=http://localhost:3000
LASTFM_API_KEY=your_lastfm_api_key
```

```bash
python3 -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

---

### 4. Configure and run the frontend

```bash
cd web
npm install
cp .env.local.example .env.local
# Set NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
npm run dev
```

The app is available at `http://localhost:3000`.

---

## Data Pipeline

### Track & Artist Sync

Each sync is scoped to a user and time range (`short_term`, `medium_term`, `long_term`):

1. **Extract** — calls `current_user_top_tracks` or `current_user_top_artists` via the Spotify Web API (limit 50)
2. **Enrich** — enriches with real play counts and minutes played from streaming history
3. **Load** — deletes existing rows for that user and time range, then inserts fresh data atomically
4. **Rank** — re-orders by actual `ms_played` from streaming history rather than Spotify's opaque ranking

### Genre Enrichment

Genre data is built from a two-source pipeline achieving 88%+ ms_played coverage:

1. **Spotify** — batch-fetches artist metadata using track URIs from streaming history via `sp.artists()`. Precise but incomplete (~49% artist coverage — Spotify's genre taxonomy has significant gaps).
2. **Last.fm fallback** — for artists with empty Spotify genres, queries `artist.getTopTags` and filters to music-genre tags above a minimum vote threshold. Raises overall coverage to 88%+.
3. **Normalization** — collapses formatting variants (`hip-hop` / `hiphop` → `hip hop`, `rnb` → `r&b`) before calculating percentages.
4. **Tag cleanup** — strips geographic, nationality, and demographic tags (`"sweden"`, `"female vocalists"`, `"american"`, etc.) that slip through Last.fm's community tagging.

Genre distribution is weighted by `ms_played` per artist, scoped to the selected time range.

### Importing Streaming History

Request your data at [spotify.com/account/privacy](https://www.spotify.com/account/privacy). Extended history (up to 5 years) takes up to 30 days. Once received:

```bash
cd api
python3 scripts/import_history.py --dir "/path/to/Spotify Extended Streaming History"
python3 scripts/enrich_artist_genres.py   # Spotify enrichment via track URIs
python3 scripts/enrich_lastfm_genres.py   # Last.fm fallback for empty genres
python3 scripts/clean_genre_tags.py       # Strip noise tags
```

---

## API Reference

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/auth/login` | Redirect to Spotify OAuth |
| `GET` | `/api/v1/auth/callback` | OAuth callback, returns JWT |
| `GET` | `/api/v1/users/me` | Current user profile |

### Tracks

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/tracks/?range={range}` | Get top tracks for time range |
| `POST` | `/api/v1/tracks/sync?range={range}` | Sync top tracks from Spotify |

### Artists

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/artists/?range={range}` | Get top artists for time range |
| `POST` | `/api/v1/artists/sync?range={range}` | Sync top artists from Spotify |

### Genres

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/genres/?range={range}` | Genre distribution weighted by ms_played |

### Recommendations

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/recommendations/?range={range}` | Personalized track recommendations |

### History

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/history/stats` | Lifetime streaming stats |
| `GET` | `/api/v1/history/yearly` | Year-by-year breakdown |
| `GET` | `/api/v1/history/heatmap` | Daily play count heatmap |
| `GET` | `/api/v1/history/patterns` | Hour-of-day and day-of-week patterns |

All endpoints require `Authorization: Bearer <jwt>` except auth routes. Valid `range` values: `short_term`, `medium_term`, `long_term`.

---

## Acknowledgments

- [Spotify Web API](https://developer.spotify.com/documentation/web-api/)
- [Last.fm API](https://www.last.fm/api)
- [Spotipy](https://github.com/plamere/spotipy)
- [Supabase](https://supabase.com)
- [Recharts](https://recharts.org)

---

<div align="center">
<sub>MIT License · Built with Python 3.9+ and Node.js 18+</sub>
</div>
