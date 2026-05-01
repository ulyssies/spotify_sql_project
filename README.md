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

SpotYourVibe connects to your Spotify account via OAuth and surfaces your listening data across three time windows: last 4 weeks, last 6 months, and all time. It runs a per-user ETL pipeline on demand — pulling data from the Spotify Web API, enriching it with artist and genre metadata, and persisting it in Supabase for fast querying. The frontend is a Next.js 14 App Router application with a collapsible sidebar, responsive grid layouts, and SWR-powered data fetching.

---

## Features

| Feature | Description |
|---|---|
| **Top Tracks** | Your top 50 tracks in a responsive grid with album art, rank overlay, and play stats from imported history |
| **Top Artists** | Your top 50 artists with circular portrait, genre tags, follower count, and popularity score |
| **Genre Insights** | Bar chart of genre distribution by track count; genres under 4% are consolidated into an Other bucket |
| **Recommendations** | Personalized track suggestions sourced from related artists, filtered against your listening history |
| **Import History** | Drag-and-drop uploader for Spotify data exports; detects both the extended and short history formats |
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
│   │   ├── genres/             # Genre aggregation from track data
│   │   ├── recommendations/    # Related-artists recommendation pipeline
│   │   └── import_/            # Streaming history ingestion
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

- Python 3.11+
- Node.js 18+
- A [Supabase](https://supabase.com) project
- A [Spotify Developer](https://developer.spotify.com/dashboard) app with OAuth credentials

---

### 1. Clone the repository

```bash
git clone https://github.com/ulyssies/spotify-visualizer.git
cd spotify-visualizer
```

---

### 2. Set up the database

Run `api/supabase/schema.sql` in the Supabase SQL editor to create all tables, indexes, and RLS policies.

---

### 3. Configure and run the API

```bash
cd api
python3 -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
```

Edit `.env` with your credentials:

```env
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
SPOTIFY_REDIRECT_URI=http://localhost:3000/auth/callback
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key
JWT_SECRET=a_long_random_secret
FRONTEND_URL=http://localhost:3000
```

Start the server:

```bash
python3 -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

---

### 4. Configure and run the frontend

```bash
cd web
npm install
cp .env.local.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

Start the dev server:

```bash
npm run dev
```

The app is available at `http://localhost:3000`.

---

## Data Pipeline

Each sync is scoped to a user and time range (`short_term`, `medium_term`, `long_term`):

1. **Extract** — calls `current_user_top_tracks` or `current_user_top_artists` via the Spotify Web API (limit 50)
2. **Enrich** — fetches artist genre metadata for each track
3. **Load** — deletes the existing rows for that user and time range, then inserts fresh data atomically
4. **Aggregate** — recalculates genre distribution from track data; genres under 4% are consolidated

Recommendations are derived by fetching related artists for the user's top artists, pulling their top tracks, and filtering against all tracks the user has already heard across every time range.

---

## Importing Spotify History

SpotYourVibe accepts both formats from the Spotify data export:

- **Extended history** (`StreamingHistory_music_*.json`) — includes full track URIs and milliseconds played
- **Short history** (`StreamingHistory*.json`) — includes artist/track name and end time; URIs are synthesised for storage

Request your data export at [spotify.com/account/privacy](https://www.spotify.com/account/privacy). Delivery typically takes up to 30 days for the full extended history; the basic export is available within a few days.

---

## Acknowledgments

- [Spotify Web API](https://developer.spotify.com/documentation/web-api/)
- [Spotipy](https://github.com/plamere/spotipy)
- [Supabase](https://supabase.com)
- [Recharts](https://recharts.org)

---

<div align="center">
<sub>MIT License · Built with Python 3.11+ and Node.js 18+</sub>
</div>
