import sqlite3
import time

def extract_and_store_top_tracks(sp, username, db_path="spotify_data.db"):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS top_tracks (
            username    TEXT,
            track_id    TEXT,
            track_name  TEXT,
            artist_name TEXT,
            genre       TEXT,
            term        TEXT,
            play_count  INTEGER,
            PRIMARY KEY (username, track_id, term)
        )
    """)
    conn.commit()

    def get_artist_genres(artist_id):
        try:
            return ', '.join(sp.artist(artist_id).get('genres', [])) or 'Unknown'
        except:
            return 'Unknown'

    def insert_for_term(term):
        # 🧹 Clear any old entries for this user + term
        cursor.execute("DELETE FROM top_tracks WHERE username = ? AND term = ?", (username, term))

        seen = set()
        count = 0

        # 1) top tracks
        for item in sp.current_user_top_tracks(limit=50, time_range=term).get("items", []):
            if count >= 25:
                break
            tid = item["id"]
            if tid in seen:
                continue
            seen.add(tid)
            cursor.execute("""
                INSERT OR REPLACE INTO top_tracks
                  (username, track_id, track_name, artist_name, genre, term, play_count)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                username,
                tid,
                item["name"],
                item["artists"][0]["name"],
                get_artist_genres(item["artists"][0]["id"]),
                term,
                count + 1
            ))
            count += 1

        # 2) fallback: recently played
        if count < 25:
            for rec in sp.current_user_recently_played(limit=50).get("items", []):
                if count >= 25:
                    break
                tid = rec["track"]["id"]
                if tid in seen:
                    continue
                seen.add(tid)
                cursor.execute("""
                    INSERT OR REPLACE INTO top_tracks
                      (username, track_id, track_name, artist_name, genre, term, play_count)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (
                    username,
                    tid,
                    rec["track"]["name"],
                    rec["track"]["artists"][0]["name"],
                    get_artist_genres(rec["track"]["artists"][0]["id"]),
                    term,
                    count + 1
                ))
                count += 1

        conn.commit()

    for t in ["short_term", "medium_term", "long_term"]:
        insert_for_term(t)
        time.sleep(1.5)

    conn.close()
    print(f"✅ Wrote top_tracks for {username} into {db_path}")
