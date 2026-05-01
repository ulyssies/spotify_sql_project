-- Enrich streaming_history with extended data fields and analytics functions.
-- Run this in the Supabase SQL editor.

ALTER TABLE streaming_history
  ADD COLUMN IF NOT EXISTS platform        text,
  ADD COLUMN IF NOT EXISTS reason_start    text,
  ADD COLUMN IF NOT EXISTS reason_end      text,
  ADD COLUMN IF NOT EXISTS shuffle         boolean,
  ADD COLUMN IF NOT EXISTS skipped         boolean,
  ADD COLUMN IF NOT EXISTS offline         boolean,
  ADD COLUMN IF NOT EXISTS incognito_mode  boolean;

-- Generated column: bare track ID stripped of the 'spotify:track:' prefix.
-- Normalizes both formats (full URI and bare ID) so joins never fail on prefix mismatches.
ALTER TABLE streaming_history
  ADD COLUMN IF NOT EXISTS spotify_track_id text
    GENERATED ALWAYS AS (replace(spotify_track_uri, 'spotify:track:', '')) STORED;

CREATE INDEX IF NOT EXISTS idx_sh_user_played_at ON streaming_history (user_id, played_at DESC);
CREATE INDEX IF NOT EXISTS idx_sh_user_artist    ON streaming_history (user_id, artist_name);
CREATE INDEX IF NOT EXISTS idx_sh_user_uri       ON streaming_history (user_id, spotify_track_uri);
CREATE INDEX IF NOT EXISTS idx_sh_user_year      ON streaming_history (user_id, EXTRACT(YEAR FROM played_at));

-- ── Lifetime stats ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION history_stats(p_user_id text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT jsonb_build_object(
    'total_plays',      COUNT(*),
    'total_ms',         COALESCE(SUM(ms_played), 0),
    'unique_artists',   COUNT(DISTINCT artist_name),
    'unique_tracks',    COUNT(DISTINCT spotify_track_uri),
    'skipped_count',    COUNT(*) FILTER (WHERE skipped = true),
    'shuffle_count',    COUNT(*) FILTER (WHERE shuffle = true),
    'meaningful_plays', COUNT(*) FILTER (WHERE ms_played >= 30000),
    'first_played_at',  MIN(played_at),
    'last_played_at',   MAX(played_at)
  )
  FROM streaming_history
  WHERE user_id = p_user_id AND track_name IS NOT NULL;
$$;

-- ── Per-year breakdown ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION history_yearly(p_user_id text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COALESCE(jsonb_agg(row ORDER BY row->>'year'), '[]'::jsonb)
  FROM (
    SELECT jsonb_build_object(
      'year',           EXTRACT(YEAR FROM played_at)::int,
      'plays',          COUNT(*),
      'total_ms',       SUM(ms_played),
      'unique_artists', COUNT(DISTINCT artist_name),
      'unique_tracks',  COUNT(DISTINCT spotify_track_uri)
    ) AS row
    FROM streaming_history
    WHERE user_id = p_user_id AND track_name IS NOT NULL
    GROUP BY 1
    ORDER BY 1
  ) t;
$$;

-- ── Daily heatmap (optional year filter) ─────────────────────────────────────
CREATE OR REPLACE FUNCTION history_heatmap(p_user_id text, p_year int DEFAULT NULL)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COALESCE(jsonb_agg(row ORDER BY row->>'day'), '[]'::jsonb)
  FROM (
    SELECT jsonb_build_object(
      'day',   DATE(played_at)::text,
      'count', COUNT(*)
    ) AS row
    FROM streaming_history
    WHERE
      user_id   = p_user_id
      AND track_name IS NOT NULL
      AND (p_year IS NULL OR EXTRACT(YEAR FROM played_at) = p_year)
    GROUP BY DATE(played_at)
    ORDER BY DATE(played_at)
  ) t;
$$;

-- ── Hour-of-day pattern ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION history_hour_pattern(p_user_id text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COALESCE(jsonb_agg(row ORDER BY (row->>'hour')::int), '[]'::jsonb)
  FROM (
    SELECT jsonb_build_object(
      'hour',  EXTRACT(HOUR FROM played_at)::int,
      'count', COUNT(*)
    ) AS row
    FROM streaming_history
    WHERE user_id = p_user_id AND track_name IS NOT NULL
    GROUP BY 1
    ORDER BY 1
  ) t;
$$;

-- ── Day-of-week pattern (0 = Sunday) ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION history_dow_pattern(p_user_id text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COALESCE(jsonb_agg(row ORDER BY (row->>'dow')::int), '[]'::jsonb)
  FROM (
    SELECT jsonb_build_object(
      'dow',   EXTRACT(DOW FROM played_at)::int,
      'count', COUNT(*)
    ) AS row
    FROM streaming_history
    WHERE user_id = p_user_id AND track_name IS NOT NULL
    GROUP BY 1
    ORDER BY 1
  ) t;
$$;

-- ── Top artists (optional year filter) ───────────────────────────────────────
CREATE OR REPLACE FUNCTION history_top_artists(
  p_user_id text,
  p_year    int  DEFAULT NULL,
  p_limit   int  DEFAULT 25
)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COALESCE(jsonb_agg(row), '[]'::jsonb)
  FROM (
    SELECT jsonb_build_object(
      'artist_name',    artist_name,
      'plays',          COUNT(*),
      'total_ms',       SUM(ms_played),
      'unique_tracks',  COUNT(DISTINCT spotify_track_uri)
    ) AS row
    FROM streaming_history
    WHERE
      user_id      = p_user_id
      AND artist_name IS NOT NULL
      AND track_name  IS NOT NULL
      AND (p_year IS NULL OR EXTRACT(YEAR FROM played_at) = p_year)
    GROUP BY artist_name
    ORDER BY SUM(ms_played) DESC
    LIMIT p_limit
  ) t;
$$;

-- ── Top tracks (optional year filter) ────────────────────────────────────────
CREATE OR REPLACE FUNCTION history_top_tracks(
  p_user_id text,
  p_year    int  DEFAULT NULL,
  p_limit   int  DEFAULT 25
)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COALESCE(jsonb_agg(row), '[]'::jsonb)
  FROM (
    SELECT jsonb_build_object(
      'track_name',         track_name,
      'artist_name',        artist_name,
      'spotify_track_uri',  spotify_track_uri,
      'plays',              COUNT(*),
      'total_ms',           SUM(ms_played)
    ) AS row
    FROM streaming_history
    WHERE
      user_id     = p_user_id
      AND track_name IS NOT NULL
      AND (p_year IS NULL OR EXTRACT(YEAR FROM played_at) = p_year)
    GROUP BY track_name, artist_name, spotify_track_uri
    ORDER BY COUNT(*) DESC
    LIMIT p_limit
  ) t;
$$;
