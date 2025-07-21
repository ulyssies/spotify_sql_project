import os
import sqlite3
import spotipy
from spotipy.oauth2 import SpotifyOAuth
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize Spotify client
sp = spotipy.Spotify(auth_manager=SpotifyOAuth(
    client_id=os.getenv("SPOTIPY_CLIENT_ID"),
    client_secret=os.getenv("SPOTIPY_CLIENT_SECRET"),
    redirect_uri=os.getenv("SPOTIPY_REDIRECT_URI"),
    scope="user-read-private user-top-read user-read-recently-played"
))

def validate_seed_tracks(track_ids):
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

def get_song_suggestions(term="short_term"):
    # Step 1: Try top tracks from DB
    conn = sqlite3.connect("spotify_data.db")
    cursor = conn.cursor()
    cursor.execute("SELECT track_id FROM top_tracks WHERE term = ? ORDER BY play_count DESC", (term,))
    db_track_ids = [row[0] for row in cursor.fetchall()]
    conn.close()

    seed_tracks = validate_seed_tracks(db_track_ids)

    # Step 2: Fallback to recently played tracks
    if len(seed_tracks) < 3:
        print("⚠️ Not enough valid tracks from DB, using recently played...")
        try:
            recent = sp.current_user_recently_played(limit=20)
            recent_ids = [item['track']['id'] for item in recent['items']]
            seed_tracks = validate_seed_tracks(recent_ids)
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
        print("🛠️ Falling back to manual track links...")
        fallback = []
        for tid in seed_tracks[:5]:
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
                })
            except Exception as e:
                print(f"❌ Error fetching fallback track info for {tid}: {e}")
                fallback.append({
                    "track": tid,
                    "artist": "Unknown",
                    "excerpt": f"[Listen on Spotify 🔗](https://open.spotify.com/track/{tid})",
                    "image": "",
                    "preview": ""
                })
        return fallback

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
            "preview": preview
        })

    return suggestions
