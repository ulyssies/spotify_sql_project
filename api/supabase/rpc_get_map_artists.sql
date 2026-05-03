-- Run this once in the Supabase SQL editor (replace if already created).
-- Returns artists the user has genuinely listened to in the given window.
-- p_min_total_ms filters out artists below a cumulative listen-time threshold.

CREATE OR REPLACE FUNCTION get_map_artists(
    p_user_id        UUID,
    p_start_date     TIMESTAMPTZ DEFAULT NULL,
    p_min_total_ms   BIGINT      DEFAULT 1800000  -- 30 minutes
)
RETURNS TABLE (
    artist_name     TEXT,
    total_ms_played BIGINT,
    play_count      BIGINT,
    genres          TEXT[]
)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT
        sh.artist_name,
        SUM(sh.ms_played)::BIGINT            AS total_ms_played,
        COUNT(*)::BIGINT                      AS play_count,
        COALESCE(ag.genres, ARRAY[]::TEXT[]) AS genres
    FROM streaming_history sh
    LEFT JOIN artist_genres ag
           ON LOWER(ag.artist_name) = LOWER(sh.artist_name)
    WHERE sh.user_id = p_user_id
      AND (p_start_date IS NULL OR sh.played_at >= p_start_date)
      AND sh.ms_played >= 30000
    GROUP BY sh.artist_name, ag.genres
    HAVING SUM(sh.ms_played) >= p_min_total_ms
    ORDER BY SUM(sh.ms_played) DESC;
$$;
