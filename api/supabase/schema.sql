-- SpotYourVibe — Supabase schema
-- Run once via the Supabase SQL editor or CLI: supabase db reset

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────────
-- users
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    spotify_id        TEXT        UNIQUE NOT NULL,
    display_name      TEXT,
    email             TEXT,
    avatar_url        TEXT,
    refresh_token     TEXT        NOT NULL,
    token_expires_at  TIMESTAMPTZ,
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    last_synced_at    TIMESTAMPTZ
);

-- ─────────────────────────────────────────────
-- top_tracks
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS top_tracks (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    spotify_track_id  TEXT        NOT NULL,
    track_name        TEXT        NOT NULL,
    artist_name       TEXT        NOT NULL,
    album_name        TEXT,
    album_art_url     TEXT,
    popularity        INT,
    time_range        TEXT        NOT NULL
                                  CHECK (time_range IN ('short_term', 'medium_term', 'long_term')),
    rank              INT         NOT NULL,
    genres            TEXT[],
    snapshot_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_top_tracks_user_range
    ON top_tracks (user_id, time_range);

-- ─────────────────────────────────────────────
-- top_artists
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS top_artists (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    spotify_artist_id   TEXT        NOT NULL,
    artist_name         TEXT        NOT NULL,
    artist_image_url    TEXT,
    genres              TEXT[],
    popularity          INT,
    followers           INT,
    time_range          TEXT        NOT NULL
                                    CHECK (time_range IN ('short_term', 'medium_term', 'long_term')),
    rank                INT         NOT NULL,
    snapshot_at         TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, spotify_artist_id, time_range)
);

CREATE INDEX IF NOT EXISTS idx_top_artists_user_range
    ON top_artists (user_id, time_range);

-- ─────────────────────────────────────────────
-- genre_snapshots
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS genre_snapshots (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    time_range   TEXT        NOT NULL
                             CHECK (time_range IN ('short_term', 'medium_term', 'long_term')),
    genre        TEXT        NOT NULL,
    percentage   FLOAT       NOT NULL,
    snapshot_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_genre_snapshots_user_range
    ON genre_snapshots (user_id, time_range);

-- ─────────────────────────────────────────────
-- streaming_history
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS streaming_history (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    played_at           TIMESTAMPTZ NOT NULL,
    ms_played           INT         NOT NULL,
    track_name          TEXT        NOT NULL,
    artist_name         TEXT        NOT NULL,
    album_name          TEXT,
    spotify_track_uri   TEXT        NOT NULL,
    UNIQUE (user_id, played_at, spotify_track_uri)
);

CREATE INDEX IF NOT EXISTS idx_streaming_history_user_uri
    ON streaming_history (user_id, spotify_track_uri);

-- ─────────────────────────────────────────────
-- artist_genres (global — not per-user)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS artist_genres (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    artist_name         TEXT        NOT NULL,
    spotify_artist_id   TEXT,
    genres              TEXT[]      NOT NULL DEFAULT '{}',
    fetched_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (artist_name)
);

CREATE INDEX IF NOT EXISTS idx_artist_genres_name
    ON artist_genres (LOWER(artist_name));

-- ─────────────────────────────────────────────
-- Row-Level Security
-- ─────────────────────────────────────────────
ALTER TABLE users              ENABLE ROW LEVEL SECURITY;
ALTER TABLE top_tracks         ENABLE ROW LEVEL SECURITY;
ALTER TABLE top_artists        ENABLE ROW LEVEL SECURITY;
ALTER TABLE genre_snapshots    ENABLE ROW LEVEL SECURITY;
ALTER TABLE streaming_history  ENABLE ROW LEVEL SECURITY;
