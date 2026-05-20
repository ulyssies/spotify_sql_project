# CLAUDE.md

This file is the local handoff guide for Claude Code or another coding agent working in this repo.

---

## Project Overview

SpotYourVibe is a full-stack Spotify music intelligence app. It connects to a user's Spotify account, syncs top tracks and artists, imports Extended Streaming History, enriches music with genre metadata, and visualizes taste as an interactive second-brain graph.

The current app is no longer the old Streamlit/SQLite version. Treat the active product as:

- **Frontend:** Next.js 14 App Router in `web/`
- **Backend:** FastAPI in `api/`
- **Database:** Supabase/Postgres
- **Auth:** Spotify OAuth handled by the API, app sessions via JWT
- **Music data:** Spotify Web API, imported Extended Streaming History, Spotify artist genres, optional Last.fm fallback tags

Local frontend used during development:

```text
http://localhost:3000
```

Local API:

```text
http://127.0.0.1:8000/api/v1
```

Use one browser origin consistently while testing auth. `localhost:3000` and `127.0.0.1:3000` have separate browser storage.

---

## Project Structure

```text
spotify_sql_project/
├── api/                         # FastAPI backend
│   ├── app/
│   │   ├── auth/                # Spotify OAuth, refresh handling, JWT sessions
│   │   ├── users/               # User profile endpoints
│   │   ├── tracks/              # Top tracks sync/read
│   │   ├── artists/             # Top artists sync/read
│   │   ├── genres/              # Genre distribution
│   │   ├── map/                 # Genre map and artist graph data
│   │   ├── history/             # Streaming history analytics
│   │   ├── import_/             # Spotify history import
│   │   └── recommendations/     # Experimental recommendation surface
│   ├── migrations/              # Supabase/Postgres migrations
│   ├── scripts/                 # Import and enrichment scripts
│   └── requirements.txt
├── web/                         # Next.js frontend
│   ├── app/                     # App Router pages
│   ├── components/              # Dashboard, map, chart, and UI components
│   ├── hooks/                   # SWR data hooks
│   └── lib/                     # API client, auth helpers, types
├── docs/screenshots/            # README preview assets
├── README.md
└── CLAUDE.md
```

---

## Current Product Shape

Core surfaces:

- Landing page with branded SpotYourVibe hero and taste-graph visual.
- Dashboard shell with bottom nav, profile menu, Spotify logo/wordmark, and time-range selector.
- Top Tracks page with horizontal ranked cards and a track insights dashboard.
- Top Artists page with horizontal ranked artist cards and an artist insights dashboard.
- Music Map page with parent genre, subgenre, artist, and central profile nodes.
- Listening History page with all-time/year stats, yearly/monthly charts, heatmap, patterns, top artists, and top tracks.
- Genres, Import Data, and experimental Recommendations pages.

Important UX direction:

- Dark, polished, Spotify-adjacent but not Spotify-clone.
- Information-dense dashboard surfaces.
- Music Map should feel like a dense neural constellation with organic structure, not a rigid pie chart.
- Cards should be practical and data-forward; avoid marketing blocks inside the authenticated app.

---

## Recent Session Changes

### History and Import

- `/history/stats` now accepts an optional `year`.
- Added `/history/monthly?year=...`.
- Added `/history/artist-yearly?artist_names=...`.
- Added `/history/node-yearly?node_type=...&label=...` for exact Music Map node-level yearly listening history.
- History stat cards now update for selected years and fall back to yearly summary data instead of blank cards.
- The old skip-rate card was replaced by a computed `Daily pace` card because Spotify skip metadata is often absent from imported history.
- Year mode uses the new month chart; all-time mode keeps the yearly chart.
- Hour-of-day and day-of-week chart bars now share a consistent baseline.
- Import handling now preserves and backfills `reason_start`, `reason_end`, `skipped`, and `shuffle` metadata.
- Import flow no longer filters out short plays or skipped rows before upload.
- Upserts replaced duplicate-ignore behavior so re-imports can enrich existing rows.

### Top Tracks

- Top tracks use compact rectangular cards in a horizontal row.
- Track insight dashboard summarizes listening time, top genre, replay concentration, artist spread, listening weight, genre mix, artist share, first-heard timing, popularity shape, and data coverage.

### Top Artists

- Top artists use a horizontal single-row carousel.
- Added an artist insights dashboard under the row.
- Artist insights include listening weight, artist leader, main genre lane, top-five pull, top artists over time, current listening weight, genre lanes, all-time overlap, audience shape, and data coverage.

### Music Map

- The map uses layered parent genre, subgenre, artist, and central profile nodes.
- Parent/subgenre/artist nodes have stronger listening-weight encoding through size, opacity, stroke, and hue.
- Artist borders are intentionally organic/blob-like instead of a hard circle.
- Hover and click states highlight local relationships; clicked nodes pin the selection and open a detail drawer.
- Clicking a node gently zooms the canvas back out to show the full map while preserving the selected drawer context.
- Drawer `Listening By Year` charts use exact node-level imported history for parent genres, subgenres, and artists instead of estimated global weighting.
- Bar hover text shows exact minutes and play count for that node/year when data is loaded.
- Artist-specific drawers now show an `Artist Snapshot` section with top song, listening rank, count of shown top songs, and artwork thumbnails instead of a one-item artist leaderboard.
- Artist top-song drawer rows show up to 10 deduplicated tracks using all-time history and Spotify artwork enrichment.
- Genre/subgenre top-song rows use the same artwork enrichment path.

### Recommendations Caveat

Spotify deprecated the native recommendations endpoint and related-artist endpoint for many apps after November 2024. The existing recommendations route should be treated as experimental and likely needs to be rebuilt around local graph/history scoring rather than relying on deprecated Spotify endpoints.

---

## Commands

Frontend checks:

```bash
cd web
npx tsc --noEmit
```

Frontend dev server:

```bash
cd web
npm run dev
```

API dev server:

```bash
cd api
python3 -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Python syntax check example:

```bash
PYTHONPYCACHEPREFIX=/private/tmp/pycache python3 -m py_compile api/app/history/service.py api/app/history/router.py
```

Whitespace check:

```bash
git diff --check
```

---

## Security Rules

- Do not read, print, modify, or commit `.env`, `.env.local`, `.cache`, Supabase keys, Spotify secrets, or local database files.
- Do not commit `.claude/`, `.agents/`, `AGENTS.md`, or `CODEX.md`; they are local/agent handoff files and are ignored.
- Supabase service role keys belong only in the backend environment.
- Spotify refresh tokens are server-side data and should never be exposed in frontend code.
- Keep screenshots/demo assets free of sensitive information before public release.

---

## Useful Notes

- The tracked README is the public project overview.
- This file is the Claude-specific local handoff.
- `CODEX.md` and `AGENTS.md` may exist locally but are ignored by git.
- If browser auth appears broken, confirm the frontend origin and API redirect origin match the environment values.
