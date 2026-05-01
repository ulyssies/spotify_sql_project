# CLAUDE.md

This file is the source of truth for Claude Code in this project. Read it fully before acting. Agents must read it before scoped work.

---

## Project Overview

SpotYourVibe is a Spotify statistics visualizer that connects to a user's Spotify account and displays their top tracks, genre distribution, and personalized song recommendations. It runs an ETL pipeline on each refresh — pulling data from the Spotify Web API, enriching it with genre metadata, and persisting it in a local SQLite database for fast querying.

**Live app:** https://spoturvibe.streamlit.app  
**Status:** Active development

---

## Stack

- **Frontend/Backend:** Streamlit (Python) — single-page app, no separate frontend
- **Language:** Python 3.9
- **Auth:** Spotify OAuth via Spotipy (`SpotifyOAuth`) — local `.env`, cloud `secrets.toml`
- **Database:** SQLite (one `.db` file per user, e.g. `spotify_{username}.db`)
- **Data:** Pandas, Plotly, Matplotlib
- **API client:** Spotipy 2.26+
- **Hosting:** Streamlit Cloud — auto-deploys from `main` on GitHub
- **Package manager:** pip

---

## Deployment

- **App:** Streamlit Cloud at `spoturvibe.streamlit.app` — push to `main` triggers redeploy
- **Secrets (cloud):** Set in Streamlit Cloud dashboard under Settings → Secrets as `SPOTIPY_CLIENT_ID`, `SPOTIPY_CLIENT_SECRET`, `SPOTIPY_REDIRECT_URI`
- **Secrets (local):** `.env` file in project root — never commit
- **Redirect URI (local):** `http://127.0.0.1:8501` — must match Spotify Dashboard exactly
- **Redirect URI (cloud):** `https://spoturvibe.streamlit.app`
- **Database:** SQLite files are local only — not committed, not deployed

---

## Project Structure

```
spotify_sql_project/
├── streamlit_app.py       # Main app — UI, auth, data display
├── extract_spotify.py     # ETL — pulls and stores top tracks
├── suggestions.py         # Recommendation logic
├── genres.py              # Genre utilities
├── utils.py               # Shared helpers
├── secrets_handler.py     # Loads credentials from .env or st.secrets
├── create_database.py     # DB schema setup
├── check_database.py      # DB inspection utility
├── requirements.txt       # Python dependencies
├── .env                   # Local credentials — never commit
├── .claude/               # Claude Code config
└── CLAUDE.md
```

---

## Conventions

- **Language:** Python only — snake_case for all variables, functions, and files
- **Commits:** Conventional commits (`feat:`, `fix:`, `chore:`, `docs:`)
- **Branches:** `feature/`, `fix/`, `chore/` prefixes
- **Error handling:** Never swallow errors silently. Surface them via `st.error()` with context.
- **Comments:** Explain *why*, not *what*. No debug comments in commits.
- **Secrets:** All credentials via `secrets_handler.py` — never hardcode in any other file
- **Database:** One SQLite file per user (`spotify_{username}.db`) — never a shared DB
- **Tests:** None currently. Manual testing via Streamlit UI.

---

## Design System

This is a Streamlit app. UI is controlled via:
- `st.markdown(..., unsafe_allow_html=True)` for custom HTML/CSS
- Plotly (`go.Figure`) for charts — use `rgb(30, 215, 96)` (Spotify green) as the primary chart color
- Streamlit native components where possible

**Color palette:**
- Primary: `#1DB954` (Spotify green)
- Background: dark (`rgba(0,0,0,0.6)` overlays)
- Text: white on dark backgrounds, gray for secondary info
- Borders/radius: `border-radius: 30px` for buttons, `1rem` for cards

The frontend-design skill (`.claude/skills/frontend-design/SKILL.md`) enforces these standards.

---

## Do Not Touch

- `.env` — never read contents aloud, never modify, never commit
- `spotify_*.db` — generated at runtime, never commit
- `.cache` — Spotipy token cache, never commit
- `requirements.txt` — only update when explicitly adding a new dependency

---

## Current Priorities

1. Fix local OAuth flow — ensure login works end-to-end with `http://127.0.0.1:8501`
2. Verify data loads correctly after login and displays top tracks, genres, and recommendations
3. Ensure cloud deployment at `spoturvibe.streamlit.app` stays in sync with `main`

---

## Known Issues

- `query_params["code"][0]` in `streamlit_app.py:40` — in Streamlit 1.32+, `st.query_params` values are strings not lists; `[0]` returns the first character, not the full code. This may silently break the OAuth callback.
- `.cache` file exists in project root from an old Spotipy session — may interfere if `cache_path` handling changes

---

## Session Notes

Detailed session history lives in `.claude/session-notes.md`. The context-manager agent maintains it. Run `/session-end` at the end of every work session.
