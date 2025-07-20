import sqlite3
import spotipy
from spotipy.oauth2 import SpotifyOAuth
from dotenv import load_dotenv
import os
import matplotlib.pyplot as plt
import time

# Load environment variables from the .env file
load_dotenv()

# Set up Spotify API Credentials from the .env file
client_id = os.getenv("SPOTIPY_CLIENT_ID")
client_secret = os.getenv("SPOTIPY_CLIENT_SECRET")
redirect_uri = os.getenv("SPOTIPY_REDIRECT_URI")

# Authenticate and access the Spotify API
sp = spotipy.Spotify(auth_manager=SpotifyOAuth(
    client_id=client_id,
    client_secret=client_secret,
    redirect_uri=redirect_uri,
    scope="user-top-read user-read-recently-played"
))

# Connect to the SQLite database
conn = sqlite3.connect('spotify_data.db')
cursor = conn.cursor()

# Drop the table if it already exists (to fix schema issues)
cursor.execute("DROP TABLE IF EXISTS top_tracks")

# Create the 'top_tracks' table with the 'term' column
cursor.execute('''
CREATE TABLE IF NOT EXISTS top_tracks (
    track_id TEXT PRIMARY KEY,
    track_name TEXT,
    artist_name TEXT,
    genre TEXT,
    term TEXT,  -- term column for time range
    play_count INTEGER
)
''')
conn.commit()

# Function to get top tracks for a given time range
def get_top_tracks(time_range, limit=50):
    print(f"Fetching top tracks for time range: {time_range}...")  # Debugging line
    return sp.current_user_top_tracks(limit=limit, time_range=time_range)

# Function to get the genre of an artist
def get_artist_genre(artist_id):
    try:
        artist = sp.artist(artist_id)
        return artist['genres'] if 'genres' in artist else []
    except Exception as e:
        print(f"Error fetching genres for artist {artist_id}: {e}")
        return ['Unknown']

# Function to insert top tracks with genres into the database
def insert_top_track_with_genre(track, time_range, play_count):
    genres = get_artist_genre(track['artists'][0]['id'])
    genre_str = ", ".join(genres) if genres else "Unknown"

    # Debugging insert
    print(f"Inserting track: {track['name']} by {track['artists'][0]['name']}")  # Debugging line

    cursor.execute('''
    INSERT OR REPLACE INTO top_tracks (track_id, track_name, artist_name, genre, term, play_count)
    VALUES (?, ?, ?, ?, ?, ?)
    ''', (track['id'], track['name'], track['artists'][0]['name'], genre_str, time_range, play_count))

    conn.commit()

# Function to insert tracks for all time ranges
def insert_tracks_for_all_time_ranges():
    time_ranges = ['short_term', 'medium_term', 'long_term']
    for time_range in time_ranges:
        tracks = get_top_tracks(time_range)
        for track in tracks['items']:
            insert_top_track_with_genre(track, time_range, 1)  # Assuming play_count is 1
        time.sleep(2)  # Pause to avoid rate limiting

# Function to analyze and visualize genres
def analyze_and_visualize_genres():
    # Query to get the genre data from the top_tracks table
    cursor.execute("SELECT genre, COUNT(*) FROM top_tracks GROUP BY genre")
    rows = cursor.fetchall()

    # Create a dictionary of genre and its count
    genre_count = {row[0]: row[1] for row in rows}

    # Remove "Unknown" genres for the pie chart
    if "Unknown" in genre_count:
        del genre_count["Unknown"]

    # Group less frequent genres into an "Other" category (optional)
    total_count = sum(genre_count.values())
    threshold = total_count * 0.05  # Genres with less than 5% of total will be grouped as "Other"
    filtered_genres = {genre: count for genre, count in genre_count.items() if count > threshold}
    other_count = total_count - sum(filtered_genres.values())
    if other_count > 0:
        filtered_genres["Other"] = other_count

    # Plot the data using matplotlib
    if filtered_genres:
        genres = list(filtered_genres.keys())
        counts = list(filtered_genres.values())

        # Create a pie chart for genres
        plt.figure(figsize=(8, 8))
        plt.pie(counts, labels=genres, autopct='%1.1f%%', startangle=90)
        plt.title('Genre Distribution of Top Tracks')
        plt.axis('equal')  # Equal aspect ratio ensures that pie is drawn as a circle.
        plt.show()

# Step 1: Fetch and insert data into the database
insert_tracks_for_all_time_ranges()

# Step 2: Analyze and visualize genre data
analyze_and_visualize_genres()

# Close the connection
conn.close()

print("Data extraction and analysis completed!")
