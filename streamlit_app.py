import streamlit as st
import sqlite3
import pandas as pd
import matplotlib.pyplot as plt
from collections import Counter
from extract_spotify import extract_and_store_top_tracks
from suggestions import get_song_suggestions
import spotipy
from spotipy.oauth2 import SpotifyOAuth
from dotenv import load_dotenv
import os

# Load local .env if exists
load_dotenv()

# Fallback to Streamlit secrets if env vars not set
SPOTIPY_CLIENT_ID = os.getenv("SPOTIPY_CLIENT_ID") or st.secrets["spotify"]["SPOTIPY_CLIENT_ID"]
SPOTIPY_CLIENT_SECRET = os.getenv("SPOTIPY_CLIENT_SECRET") or st.secrets["spotify"]["SPOTIPY_CLIENT_SECRET"]
SPOTIPY_REDIRECT_URI = os.getenv("SPOTIPY_REDIRECT_URI") or st.secrets["spotify"]["SPOTIPY_REDIRECT_URI"]

st.set_page_config(page_title="Spotify Visualizer", layout="centered")

sp = spotipy.Spotify(auth_manager=SpotifyOAuth(
    client_id=SPOTIPY_CLIENT_ID,
    client_secret=SPOTIPY_CLIENT_SECRET,
    redirect_uri=SPOTIPY_REDIRECT_URI,
    scope="user-read-private"
))
username = sp.current_user().get("display_name", "Your")

st.title(f"{username}'s 🎷 Spotify Listening Stats")

if st.button("🔄 Load My Spotify Data"):
    with st.spinner("Fetching your Spotify data..."):
        extract_and_store_top_tracks()
    st.success("✅ Data loaded! Refresh the chart below.")

term_options = {
    "Last 4 Weeks": "short_term",
    "Last 6 Months": "medium_term",
    "All Time": "long_term"
}
term_label = st.selectbox("Top Tracks for:", list(term_options.keys()))
term = term_options[term_label]

conn = sqlite3.connect("spotify_data.db")
df = pd.read_sql_query(
    "SELECT track_name, artist_name, genre FROM top_tracks WHERE term = ? ORDER BY play_count ASC",
    conn, params=(term,)
)
conn.close()

tab1, tab2 = st.tabs(["🎵 Top Tracks", "📊 Genre Chart"])

with tab1:
    st.subheader(f"🎶 Top Tracks - {term_label}")
    df_display = df.copy()
    df_display.insert(0, "#", range(1, len(df_display) + 1))
    df_display = df_display[["#", "track_name", "artist_name"]].rename(columns={
        "track_name": "Track",
        "artist_name": "Artist"
    })
    st.dataframe(df_display, use_container_width=True, hide_index=True)

    st.markdown("---")
    st.subheader("💡 Suggested Songs Based on Your Top Tracks")
    suggestions = get_song_suggestions(term)

    if suggestions:
        for s in suggestions:
            name = s["track"]
            artist = s["artist"]
            excerpt = s["excerpt"]
            image_url = s.get("image", "")
            with st.container():
                col1, col2 = st.columns([1, 5])
                with col1:
                    if image_url:
                        st.image(image_url, width=64)
                    else:
                        st.markdown("🎵")
                with col2:
                    st.markdown(f"**{name}**  \n*by {artist}*  \n💬 {excerpt}")
            st.markdown("---")
    else:
        st.info("No song suggestions available. Try refreshing your data.")

with tab2:
    st.subheader(f"📊 Genre Distribution - {term_label}")
    genres = []
    for g in df["genre"]:
        if g and g != "Unknown":
            genres += [x.strip() for x in g.split(',') if x.strip()]
    genre_counts = Counter(genres)
    top_genres = dict(genre_counts.most_common(6))
    other = sum(c for g, c in genre_counts.items() if g not in top_genres)
    if other:
        top_genres["Other"] = other
    if top_genres:
        fig, ax = plt.subplots()
        ax.pie(
            top_genres.values(),
            labels=top_genres.keys(),
            autopct='%1.1f%%',
            startangle=140
        )
        ax.axis("equal")
        st.pyplot(fig)
    else:
        st.info("No genre data available for this term.")
