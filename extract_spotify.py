import spotipy
from spotipy.oauth2 import SpotifyOAuth
import sqlite3
from dotenv import load_dotenv
import os
import time

# Load environment variables
load_dotenv()

# Set up Spotify API credentials from the .env file
client_id = os.getenv("SPOTIPY_CLIENT_ID")
client_secret = os.getenv("SPOTIPY_CLIENT_SECRET")
redirect_uri = os.getenv("SPOTIPY_REDIRECT_URI")

# Initialize Spotipy client
sp = spotipy.Spotify(auth_manager=SpotifyOAuth(
    client_id=client_id,
    client_secret=client_secret,
    redirect_uri=redirect_uri,
    scope="user-top-read user-read-recently-played"
))

# Connect to SQLite database
conn = sqlite3.connect("spotify_data.db")
cursor = conn.cursor()

# Create the table if it doesn't exist
cursor.execute('''
CREATE TABLE IF NOT EXISTS top_tracks (
    track_id TEXT PRIMARY KEY,
    track_name TEXT,
    artist_name TEXT,
    genre TEXT,
    term TEXT,
    play_count INTEGER
)
''')
conn.commit()

# Fetch genres for each track by artist
def get_artist_genres(artist_id):
    try:
        artist = sp.artist(artist_id)
        genres = artist.get('genres', [])
        return ', '.join(genres) if genres else 'Unknown'
    except Exception as e:
        print(f"Error fetching genres for artist {artist_id}: {e}")
        return 'Unknown'

# Fetch top tracks for a given time range and store in the database
def insert_top_tracks_for_term(time_range):
    print(f"Fetching top tracks for {time_range}...")
    results = sp.current_user_top_tracks(limit=50, time_range=time_range)
    
    for item in results['items']:
        track_id = item['id']
        track_name = item['name']
        artist_name = item['artists'][0]['name']
        artist_id = item['artists'][0]['id']
        
        # Get genre from the artist
        genre = get_artist_genres(artist_id)
        
        # Insert data into the database
        cursor.execute('''
        INSERT OR REPLACE INTO top_tracks (track_id, track_name, artist_name, genre, term, play_count)
        VALUES (?, ?, ?, ?, ?, ?)
        ''', (track_id, track_name, artist_name, genre, time_range, 1))  # play_count starts at 1
    conn.commit()

# Insert top tracks for all time ranges
def insert_tracks_for_all_time_ranges():
    for time_range in ['short_term', 'medium_term', 'long_term']:
        insert_top_tracks_for_term(time_range)
        # To avoid hitting rate limits, wait a moment between requests
        time.sleep(2)

# Run the extraction and store in the database
insert_tracks_for_all_time_ranges()

# Close the connection
conn.close()

print("Data extraction and analysis completed!")
