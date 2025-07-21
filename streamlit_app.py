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

# Load environment variables
load_dotenv()

# Credentials (env for local, secrets for Streamlit Cloud)
SPOTIPY_CLIENT_ID = os.getenv("SPOTIPY_CLIENT_ID") or st.secrets["spotify"]["SPOTIPY_CLIENT_ID"]
SPOTIPY_CLIENT_SECRET = os.getenv("SPOTIPY_CLIENT_SECRET") or st.secrets["spotify"]["SPOTIPY_CLIENT_SECRET"]
SPOTIPY_REDIRECT_URI = os.getenv("SPOTIPY_REDIRECT_URI") or st.secrets["spotify"]["SPOTIPY_REDIRECT_URI"]

# Page config
st.set_page_config(page_title="Spotify Visualizer", layout="centered")
st.title("🎵 Spotify Listening Stats")

# Store Spotify client in session
if "sp" not in st.session_state:
    st.session_state.sp = None

# Authentication logic
if st.session_state.sp is None:
    auth_manager = SpotifyOAuth(
        client_id=SPOTIPY_CLIENT_ID,
        client_secret=SPOTIPY_CLIENT_SECRET,
        redirect_uri=SPOTIPY_REDIRECT_URI,
        scope="user-read-private user-top-read user-read-recently-played",
        cache_path=".spotify_cache",
        show_dialog=True
    )

    # Use updated API
    query_params = st.query_params
    if "code" in query_params:
        code = query_params["code"][0]
        token_info = auth_manager.get_access_token(code, as_dict=False)
        sp = spotipy.Spotify(auth_manager=auth_manager)
        user = sp.current_user()
        st.session_state.sp = sp
        st.session_state.username = user.get("display_name", "Your")
        st.query_params.clear()  # clean URL
        st.rerun()
    else:
        auth_url = auth_manager.get_authorize_url()
        st.markdown(
            f"""
            <style>
            .spotify-button {{
                background-color: #1DB954;
                border: none;
                color: white;
                padding: 0.75rem 1.5rem;
                font-size: 1rem;
                border-radius: 30px;
                cursor: pointer;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                transition: background-color 0.3s ease, transform 0.2s ease;
            }}
            .spotify-button:hover {{
                background-color: #1ed760;
                transform: scale(1.03);
            }}
            </style>

            <div style="display: flex; justify-content: center; align-items: center; margin-top: 1rem;">
                <a href="{auth_url}" target="_self" style="text-decoration: none;">
                    <button class="spotify-button">
                        🔐 Login with Spotify
                    </button>
                </a>
            </div>
            """,
            unsafe_allow_html=True
        )
        st.stop()

# After successful login
sp = st.session_state.sp
username = st.session_state.username
st.header(f"Welcome, {username}!")

# Load data
if st.button("🔄 Load My Spotify Data"):
    with st.spinner("Fetching your Spotify data..."):
        extract_and_store_top_tracks(sp)
    st.success("✅ Data loaded! Refresh the chart below.")

# Time range selection
term_options = {
    "Last 4 Weeks": "short_term",
    "Last 6 Months": "medium_term",
    "All Time": "long_term"
}
term_label = st.selectbox("Top Tracks for:", list(term_options.keys()))
term = term_options[term_label]

# Load top tracks
conn = sqlite3.connect("spotify_data.db")
df = pd.read_sql_query(
    "SELECT track_name, artist_name, genre FROM top_tracks WHERE term = ? ORDER BY play_count ASC",
    conn, params=(term,)
)
conn.close()

# UI Tabs
tab1, tab2 = st.tabs(["🎵 Top Tracks", "📊 Genre Chart"])

# --- Top Tracks Tab ---
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
    suggestions = get_song_suggestions(term, sp)

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
                    st.markdown(f"**{name}**  ")
                    st.markdown(f"*by {artist}*  ")
                    st.markdown(f"💬 {excerpt}")
            st.markdown("---")
    else:
        st.info("No song suggestions available. Try refreshing your data.")

# --- Genre Chart Tab ---
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
