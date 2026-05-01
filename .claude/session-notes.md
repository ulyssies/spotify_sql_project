# Session Notes

Maintained by the context-manager agent. Do not edit manually — use `/session-end` to write entries.

---

## 2026-04-29 — Project setup and OAuth fix

### Built / Changed
- Cloned repo from GitHub, installed all dependencies via `pip3`
- Created `.env` with `SPOTIPY_CLIENT_ID`, `SPOTIPY_CLIENT_SECRET`, `SPOTIPY_REDIRECT_URI`
- Fixed redirect URI mismatch — changed `.env` from `http://localhost:8501` to `http://127.0.0.1:8501` to match Spotify Dashboard config
- Initialized full `.claude/` setup: `CLAUDE.md`, agents (code-reviewer, context-manager, debugger, docs-writer), commands (pre-commit, session-end), frontend-design skill, session-notes

### Decisions Made
- Use `http://127.0.0.1:8501` as local redirect URI to match the existing Spotify Dashboard configuration rather than changing the Dashboard
- Copied template from `~/claude-template/` and tailored all agents and skills for a Python/Streamlit/Spotipy stack

### Known Issues
- `query_params["code"][0]` in `streamlit_app.py:40` — Streamlit 1.32+ returns strings from `st.query_params`, not lists; `[0]` returns the first character of the OAuth code instead of the full code, which will silently break the login callback
- `.cache` file in project root from an old Spotipy session — should be deleted or gitignored more explicitly
- OAuth login flow not yet confirmed working end-to-end after redirect URI fix

### Next Steps
- Confirm login works end-to-end: run app, click login, authorize on Spotify, verify redirect back to app loads data
- If login still fails, fix the `query_params["code"][0]` bug in `streamlit_app.py:40`

---
