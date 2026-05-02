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

## 2026-05-01 — Streaming history pipeline and enrichment

### What we did
- Added streaming history import (`api/scripts/import_history.py`), history router/service (`api/app/history/`), migration `003_streaming_history_enrich.sql` with 7 SQL RPC functions, and history dashboard page (`web/app/dashboard/history/page.tsx`)
- Added genre map and artist web D3 visualizations (`web/components/map/GenreMap.tsx`, `ArtistWeb.tsx`) with force-directed layout and same-family genre clustering
- Enriched top tracks with play counts from streaming_history: `api/app/tracks/service.py` queries `spotify_track_uri` to avoid PostgREST silent failures; re-ranks by play_count DESC scoped by time range
- Enriched top artists similarly: `api/app/artists/service.py` queries `streaming_history.artist_name` directly; long_term uses `history_top_artists` RPC; re-ranks by total_minutes
- Rebuilt genre chart: `api/app/genres/service.py` now weights genres by ms_played from streaming_history scoped by time range
- Made 5 logical git commits covering all of the above

### Decisions made
- Query `spotify_track_uri` (full URI column) instead of the generated `spotify_track_id` STORED column — PostgREST silently returns empty results on generated columns with `.in_()`
- `artist_genres` table is global (not per-user) — genres are the same regardless of listener
- Date-scope all streaming_history enrichment by time range so short/medium term reflect recent listening

### Known issues / still broken
- `artist_genres` table was empty — `enrich_artist_genres.py` had never successfully run
- Genre chart falling back to top_tracks (25 songs) causing uniform distribution across all time ranges
- `.cache` Spotipy file in project root should not be committed

---

## 2026-05-02 — Genre pipeline overhaul

### What we did

**Diagnosed root cause of broken genre chart:**
- Confirmed `artist_genres` was empty via SQL — genre chart was falling back to 25 Spotify top tracks, producing uniform "alternative rock" results for all three time ranges
- Confirmed streaming history has 276,834 rows from 2017–2026 across 4,453 distinct artists; time-range scoping was working correctly at the DB level

**Rewrote `enrich_artist_genres.py` (URI-based approach):**
- Old approach: text search `sp.search(q='artist:"name"')` — unreliable, missed 6LACK, Baby Keem, Frank Ocean, etc.
- New approach: pull all distinct `spotify_track_uri` from streaming_history → batch-fetch tracks via `sp.tracks()` → batch-fetch artist genres via `sp.artists()` — exact, no guessing
- Fixed pagination bug: `page_size = 10_000` exceeded Supabase's 1,000-row API cap, causing loop to exit after one page and only finding ~122 of 4,453 artists
- Fixed Python 3.9 incompatibility: replaced `str | None` syntax with `Optional[str]` from `typing`
- Fixed duplicate constraint error: two artist IDs can share the same lowercase name; deduplicate before upserting, prefer entry with genres
- Result: 4,451 artists enriched, 48.8% with Spotify genre data (Spotify's taxonomy has significant gaps for many well-known artists)

**Added Last.fm fallback (`enrich_lastfm_genres.py`):**
- For all artists with empty Spotify genres, queries Last.fm `artist.getTopTags`
- Filters tags by minimum vote count (10) and a `NON_GENRE_TAGS` blocklist
- Fixed pagination bug in `get_empty_artists()`: wasn't selecting `genres` column so all rows looked empty; also wasn't paginating
- Result: 905 + 1,372 more artists filled; ms_played coverage raised from 54.7% → 88.5%
- Frank Ocean: Spotify returned empty; Last.fm returned `["rnb", "soul", "hip-hop", "r&b"]`

**Added tag cleanup (`clean_genre_tags.py`):**
- Strips geographic (country/city), nationality, demographic (`"female vocalists"`), and noise tags from all existing `artist_genres` rows
- Comprehensive blocklist of ~100 entries
- Better to have no tags than `"sweden 1.2%"` on the genre chart

**Genre service improvements (`api/app/genres/service.py`):**
- Lowered display threshold from 2.0% → 1.0% so more named genres survive
- Raised TOP_N cap from 10 → 12
- Pinned "Other" bucket last — removed final `sorted()` call that was floating Other to #1
- Added `_normalize_genre()` with alias map: `hip-hop`/`hiphop` → `hip hop`, `rnb`/`r&b` variants → `r&b`

**Frontend (`web/components/genres/GenreChart.tsx`):**
- Removed "Other" bar from the chart entirely
- Added collapsible "N more genres — X% of listening" section below chart with genre tag cloud
- Preserved color-coded bars by genre family (rap=red, r&b=amber, pop=pink, etc.)

**Added `LASTFM_API_KEY` to `api/app/config.py`** with empty string default so app doesn't crash without it.

**3 commits:**
- `fix: rewrite genre enrichment to use Spotify track URIs instead of name search`
- `feat: add Last.fm fallback enrichment and genre tag cleanup`
- `feat: improve genre chart accuracy and UX`

### Decisions made
- Hybrid Spotify + Last.fm enrichment: Spotify data is more precise where it exists; Last.fm has better coverage for artists Spotify ignores. Same approach as stats.fm.
- `artist_genres` stays global (not per-user) — genres are universal; every new user benefits from previously enriched artists
- Did NOT implement tag weight storage (Last.fm returns vote counts per tag) — would require schema change from `TEXT[]` to JSONB; deferred to music map session where genre taxonomy will be redesigned anyway
- Did NOT merge hip-hop and r&b parent categories — deferred to music map session; normalization layer will be built there

### Known issues / still open
- ~11.5% of ms_played still uncovered — artists genuinely absent from both Spotify and Last.fm genre data
- Frank Ocean tagged as "hip-hop" by Last.fm community (Odd Future association); inflates hip-hop count slightly. Fix requires storing tag vote weights and using top 1-2 tags only — deferred
- Geographic and demographic tag blocklist is comprehensive but not exhaustive — re-run `clean_genre_tags.py` if new noise tags appear
- `enrich_lastfm_genres.py` and `enrich_artist_genres.py` are developer scripts; for public users, enrichment must be triggered automatically inside the history import endpoint (Phase 2 roadmap item)

### Next session — pick up here
- **Music map feature**: genre grouping/normalization layer (map Spotify micro-genres to parent categories), tag weight storage for Last.fm, genre clustering for the force-directed map visualization
- **Phase 2 multi-user**: inline enrichment in `tracks/service.py` sync + history import web UI so public users get accurate genres without running scripts
- Verify genre chart in app reflects correct distribution (R&B should be significantly higher now that Frank Ocean is tagged)

---
