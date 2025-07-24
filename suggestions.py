import sqlite3
import spotipy

def validate_seed_tracks(track_ids, sp):
    valid = []
    print("🔍 Validating seed tracks...")
    for tid in track_ids:
        try:
            track = sp.track(tid)
            if not track:
                print(f"⛔ Invalid track: {tid}")
                continue
            if track.get("is_local", False):
                print(f"⚠️ Skipping local track: {tid}")
                continue
            if track.get("id"):
                print(f"✅ Valid track: {tid}")
                valid.append(tid)
            if len(valid) >= 5:
                break
        except Exception as e:
            print(f"❌ Error validating track {tid}: {e}")
    return valid

def get_song_suggestions(term="short_term", sp=None, username=None, db_path=None):
    if not sp:
        print("❌ Spotify client not provided.")
        return []
    if not username:
        print("❌ Username not provided.")
        return []

    # default to per-user DB if not provided
    if db_path is None:
        db_path = f"spotify_{username}.db"

    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute(
            "SELECT track_id FROM top_tracks WHERE username = ? AND term = ? ORDER BY play_count DESC",
            (username, term)
        )
        db_track_ids = [row[0] for row in cursor.fetchall()]
        conn.close()
    except Exception as e:
        print(f"❌ Could not read from DB {db_path}: {e}")
        return []

    seed_tracks = validate_seed_tracks(db_track_ids, sp)

    if len(seed_tracks) < 3:
        print("⚠️ Not enough valid tracks from DB, using recently played...")
        try:
            recent = sp.current_user_recently_played(limit=20)
            recent_ids = [item['track']['id'] for item in recent['items']]
            seed_tracks = validate_seed_tracks(recent_ids, sp)
        except Exception as e:
            print(f"❌ Could not fetch recent tracks: {e}")
            return []

    if not seed_tracks:
        print("❌ No valid seed tracks found.")
        return []

    try:
        print("🎯 Using seed tracks:", seed_tracks)
        recs = sp.recommendations(seed_tracks=seed_tracks[:5], limit=5)
    except Exception as e:
        print(f"❌ Spotify API error (recommendations): {e}")
        return manual_suggestions(seed_tracks[:5], sp)

    suggestions = []
    for track in recs['tracks']:
        name = track['name']
        artist = track['artists'][0]['name']
        album = track['album']['name']
        preview = track.get('preview_url', '')
        image_url = track['album']['images'][0]['url'] if track['album']['images'] else ""
        duration_ms = track.get('duration_ms', 0)
        minutes = duration_ms // 60000
        seconds = (duration_ms % 60000) // 1000
        duration = f"{minutes}:{seconds:02d}"

        excerpt = f"🎵 **{name}** by *{artist}* from the album \"{album}\" ({duration})."
        if preview:
            excerpt += f" [Preview ▶️]({preview})"

        suggestions.append({
            "track": name,
            "artist": artist,
            "excerpt": excerpt,
            "image": image_url,
            "preview": preview,
            "url": f"https://open.spotify.com/track/{track['id']}"
        })

    return suggestions

def manual_suggestions(track_ids, sp):
    fallback = []
    for tid in track_ids:
        try:
            track = sp.track(tid)
            name = track['name']
            artist = track['artists'][0]['name']
            image_url = track['album']['images'][0]['url'] if track['album']['images'] else ""
            preview = track.get('preview_url', '')
            excerpt = f"🎵 **{name}** by *{artist}*. [Listen on Spotify 🔗](https://open.spotify.com/track/{tid})"
            if preview:
                excerpt += f"\n🔊 [Preview ▶️]({preview})"
            fallback.append({
                "track": name,
                "artist": artist,
                "excerpt": excerpt,
                "image": image_url,
                "preview": preview
                "url": f"https://open.spotify.com/track/{track['id']}"
            })
        except Exception as e:
            print(f"❌ Error fetching fallback track info for {tid}: {e}")
            fallback.append({
                "track": name,
                "artist": artist,
                "excerpt": excerpt,
                "image": image_url,
                "preview": preview,
                "url": f"https://open.spotify.com/track/{tid}"
            })

    return fallback
