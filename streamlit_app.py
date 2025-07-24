import os
import streamlit as st
import sqlite3
import pandas as pd
import matplotlib.pyplot as plt
from collections import Counter
from extract_spotify import extract_and_store_top_tracks
from suggestions import get_song_suggestions
import plotly.graph_objects as go
import spotipy
from spotipy.oauth2 import SpotifyOAuth
from secrets_handler import SPOTIPY_CLIENT_ID, SPOTIPY_CLIENT_SECRET, SPOTIPY_REDIRECT_URI

# 🔁 Always reset on fresh start (forces login and clears data)
if os.path.exists(".cache"):
    os.remove(".cache")
st.session_state.clear()

st.set_page_config(page_title="Spotify Statistics Visualizer", layout="centered")

# Initialize session variables
if "sp" not in st.session_state:
    st.session_state.sp = None
if "data_loaded" not in st.session_state:
    st.session_state.data_loaded = False
if "df" not in st.session_state:
    st.session_state.df = pd.DataFrame()
if "username" not in st.session_state:
    st.session_state.username = None
if "display_name" not in st.session_state:
    st.session_state.display_name = None

# 🔐 Handle Spotify login
if st.session_state.sp is None:
    auth_manager = SpotifyOAuth(
        client_id=SPOTIPY_CLIENT_ID,
        client_secret=SPOTIPY_CLIENT_SECRET,
        redirect_uri=SPOTIPY_REDIRECT_URI,
        scope="user-read-private user-top-read user-read-recently-played",
        cache_path=".cache"
    )
    token_info = auth_manager.get_cached_token()
    if token_info:
        try:
            sp = spotipy.Spotify(auth_manager=auth_manager)
            user = sp.current_user()
            st.session_state.sp = sp
            st.session_state.username = user["id"]
            st.session_state.display_name = user.get("display_name", "User")
        except:
            st.error("Spotify login failed. Please refresh and try again.")
            st.stop()
    else:
        auth_url = auth_manager.get_authorize_url()
        st.markdown(f"""
            <div style='text-align:center;padding-top:5rem;'>
                <h1 style='font-size:3rem;'>🌷 SpotYourVibe</h1>
                <p>This is a personalized Spotify stats visualizer.<br>Log in to explore your top tracks, genres, and discover new music.</p>
                <a href='{auth_url}'><button style='margin-top:1rem;padding:1rem 2rem;background:#1DB954;color:white;border:none;border-radius:30px;font-size:1.2rem;'>🔐 Log in with Spotify</button></a>
            </div>
        """, unsafe_allow_html=True)
        st.stop()

# 🎉 Logged in successfully
sp = st.session_state.sp
username = st.session_state.username
name = st.session_state.display_name

col1, col2, col3 = st.columns([2, 6, 2])
with col1:
    load_clicked = st.button("🔄 Load My Spotify Data")
with col3:
    if st.button("🚪 Log out"):
        st.session_state.clear()
        if os.path.exists(".cache"):
            os.remove(".cache")
        st.rerun()

term_options = {
    "Last 4 Weeks": "short_term",
    "Last 6 Months": "medium_term",
    "All Time": "long_term"
}
term_label = st.selectbox("Top Tracks for:", list(term_options.keys()), index=0)
term = term_options[term_label]

if load_clicked:
    with st.spinner("Fetching your Spotify data..."):
        extract_and_store_top_tracks(sp, username)
        conn = sqlite3.connect("spotify_data.db")
        df = pd.read_sql_query(
            "SELECT track_name, artist_name, genre FROM top_tracks WHERE username = ? AND term = ?",
            conn,
            params=(username, term)
        )
        conn.close()
        st.session_state.df = df
        st.session_state.data_loaded = True

    st.success(f"✅ Data loaded for {name}!")
    st.header(f"👋 Welcome, {name}!")

if st.session_state.data_loaded:
    df = st.session_state.df
    if not df.empty:
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
            suggestions = get_song_suggestions(term, sp)
            if suggestions:
                for s in suggestions:
                    name = s["track"]
                    artist = s["artist"]
                    excerpt = s["excerpt"]
                    image_url = s.get("image", "")
                    url = s.get("url", "")

                    with st.container():
                        col1, col2 = st.columns([1, 6])
                        with col1:
                            if image_url:
                                st.image(image_url, width=96)
                        with col2:
                            st.markdown(f"**{name}**")
                            st.markdown(f"*by {artist}*")
                            st.markdown(f"💬 [{name} by {artist} — Listen on Spotify]({url})")
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
            total = sum(genre_counts.values())
            genre_df = pd.DataFrame(genre_counts.items(), columns=["Genre", "Count"])
            genre_df["Percentage"] = genre_df["Count"] / total * 100
            genre_df = genre_df.sort_values("Count", ascending=False).reset_index(drop=True)

            if not genre_df.empty:
                fig = go.Figure(go.Bar(
                    x=genre_df["Genre"],
                    y=genre_df["Percentage"],
                    text=genre_df["Percentage"].apply(lambda x: f"{x:.1f}%"),
                    textposition='auto',
                    marker_color='rgb(30,215,96)'
                ))
                fig.update_layout(
                    yaxis_title="Percentage (%)",
                    xaxis_title="Genre",
                    title=f"Genre Breakdown - {term_label}",
                    height=500
                )
                st.plotly_chart(fig, use_container_width=True)
            else:
                st.info("No genre data available for this term.")
else:
    st.info("Click '🔄 Load My Spotify Data' to view your personalized stats.")
