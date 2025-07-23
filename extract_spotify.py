import sqlite3
import time

def extract_and_store_top_tracks(sp, username):
    conn = sqlite3.connect("spotify_data.db")
    cursor = conn.cursor()

    cursor.execute("DROP TABLE IF EXISTS top_tracks")
    cursor.execute('''
        CREATE TABLE top_tracks (
            track_id TEXT,
            track_name TEXT,
            artist_name TEXT,
            genre TEXT,
            term TEXT,
            play_count INTEGER,
            username TEXT,
            PRIMARY KEY (track_id, term, username)
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
        print(f"Fetching top tracks for {term}...")
        results = sp.current_user_top_tracks(limit=50, time_range=term)
        items = results.get('items', [])
        seen_ids = set()
        inserted = 0

        for item in items:
            if inserted >= 25:
                break
            tid = item['id']
            seen_ids.add(tid)
            cursor.execute('''
                INSERT INTO top_tracks VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                tid,
                item['name'],
                item['artists'][0]['name'],
                get_artist_genres(item['artists'][0]['id']),
                term,
                inserted + 1,
                username
            ))
            inserted += 1

        if inserted < 25:
            print("Filling with recent tracks...")
            recent = sp.current_user_recently_played(limit=50)
            for r in recent.get('items', []):
                tid = r['track']['id']
                if tid in seen_ids:
                    continue
                seen_ids.add(tid)
                cursor.execute('''
                    INSERT INTO top_tracks VALUES (?, ?, ?, ?, ?, ?, ?)
                ''', (
                    tid,
                    r['track']['name'],
                    r['track']['artists'][0]['name'],
                    get_artist_genres(r['track']['artists'][0]['id']),
                    term,
                    inserted + 1,
                    username
                ))
                inserted += 1
                if inserted >= 25:
                    break
        conn.commit()

    for term in ['short_term', 'medium_term', 'long_term']:
        insert_top_tracks_for_term(term)
        time.sleep(1.5)

    conn.close()
    print("✅ Data extraction and update complete!")
