import sqlite3
import time

def extract_and_store_top_tracks(sp, username):
    conn = sqlite3.connect("spotify_data.db")
    cursor = conn.cursor()

    # 1) Create table once, if it doesn't exist, with username as part of the key
    cursor.execute('''
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
    ''')
    conn.commit()

    def get_artist_genres(artist_id):
        try:
            artist = sp.artist(artist_id)
            return ', '.join(artist.get('genres', [])) or 'Unknown'
        except:
            return 'Unknown'

    def insert_top_tracks_for_term(term):
        print(f"Fetching top tracks for {term} for user {username}...")
        results = sp.current_user_top_tracks(limit=50, time_range=term)
        items = results.get('items', [])
        seen_ids = set()
        inserted = 0

        # Top 25 tracks
        for item in items:
            if inserted >= 25:
                break
            tid = item['id']
            seen_ids.add(tid)
            cursor.execute('''
                INSERT OR REPLACE INTO top_tracks
                (username, track_id, track_name, artist_name, genre, term, play_count)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                username,
                tid,
                item['name'],
                item['artists'][0]['name'],
                get_artist_genres(item['artists'][0]['id']),
                term,
                inserted + 1
            ))
            inserted += 1

        # Fill up to 25 with recently played if needed
        if inserted < 25:
            print("Filling with recent tracks...")
            recent = sp.current_user_recently_played(limit=50)
            for r in recent.get('items', []):
                tid = r['track']['id']
                if tid in seen_ids:
                    continue
                seen_ids.add(tid)
                cursor.execute('''
                    INSERT OR REPLACE INTO top_tracks
                    (username, track_id, track_name, artist_name, genre, term, play_count)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                ''', (
                    username,
                    tid,
                    r['track']['name'],
                    r['track']['artists'][0]['name'],
                    get_artist_genres(r['track']['artists'][0]['id']),
                    term,
                    inserted + 1
                ))
                inserted += 1
                if inserted >= 25:
                    break

        conn.commit()

    # Run for each term
    for t in ['short_term', 'medium_term', 'long_term']:
        insert_top_tracks_for_term(t)
        time.sleep(1.5)

    conn.close()
    print("✅ Data extraction and update complete!")
