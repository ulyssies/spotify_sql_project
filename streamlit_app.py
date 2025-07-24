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

st.set_page_config(page_title="Spotify Statistics Visualizer", layout="centered")

# Session state initialization
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

# Spotify login
if st.session_state.sp is None:
    auth_manager = SpotifyOAuth(
        client_id=SPOTIPY_CLIENT_ID,
        client_secret=SPOTIPY_CLIENT_SECRET,
        redirect_uri=SPOTIPY_REDIRECT_URI,
        scope="user-read-private user-top-read user-read-recently-played",
        cache_path=".cache",
    )

    token_info = auth_manager.get_cached_token()

    if token_info:
        sp = spotipy.Spotify(auth_manager=auth_manager)
        user = sp.current_user()
        st.session_state.sp = sp
        st.session_state.username = user["id"]
        st.session_state.display_name = user.get("display_name", "User")
    else:
        auth_url = auth_manager.get_authorize_url()
        st.markdown("<h1 style='text-align: center;'>Spotify Statistics Visualizer</h1>", unsafe_allow_html=True)
        st.markdown(
            f"""
            <div style='background-color: rgba(0,0,0,0.6); padding: 2rem; border-radius: 1rem; text-align: center;'>
                <h1 style='font-size: 2.5rem;'>
                    <span style='font-weight: bold;'>🌷 SpotYourVibe</span>
                </h1>
                <p>This is a personalized Spotify stats visualizer.<br>Log in to explore your top tracks, genres, and discover new music.</p>
                <a href='{auth_url}'>
                    <button style='margin-top: 1rem; background-color: #1DB954; border: none; color: white; padding: 0.75rem 1.5rem; border-radius: 30px; font-weight: bold; font-size: 1rem;'>
                        🔐 Log in with Spotify
                    </button>
                </a>
                <p style='margin-top: 1rem; font-size: 0.85rem; color: gray;'>🔐 Spotify login required — no account data is stored.</p>
            </div>
            """,
            unsafe_allow_html=True
        )
        st.stop()

# Logged in
sp = st.session_state.sp
username = st.session_state.username
display_name = st.session_state.display_name

st.markdown(f"## 👋 Welcome, {display_name}!")

# Load button
if st.button("🔄 Load My Spotify Data"):
    with st.spinner("Fetching your Spotify data..."):
        extract_and_store_top_tracks(sp, username)
        st.session_state.data_loaded = True
        st.success(f"✅ Data loaded for {display_name}!")

# Time selection
term_options = {
    "Last 4 Weeks": "short_term",
    "Last 6 Months": "medium_term",
    "All Time": "long_term"
}
term_label = st.selectbox("Top Tracks for:", list(term_options.keys()))
term = term_options[term_label]

# Load user-specific data if available
df = pd.DataFrame()
if st.session_state.data_loaded:
    conn = sqlite3.connect("spotify_data.db")
    df = pd.read_sql_query(
        "SELECT track_name, artist_name, genre FROM top_tracks WHERE username = ? AND term = ?",
        conn,
        params=(username, term)
    )
    conn.close()

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
                        else:
                            st.markdown("🎵")
                    with col2:
                        st.markdown(f"**{name}**  ")
                        st.markdown(f"*by {artist}*  ")
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

            if term != "long_term":
                long_df = pd.read_sql_query(
                    "SELECT genre FROM top_tracks WHERE genre != 'Unknown' AND term = 'long_term' AND username = ?",
                    sqlite3.connect("spotify_data.db"),
                    params=(username,)
                )
                long_genres = []
                for g in long_df["genre"]:
                    long_genres += [x.strip() for x in g.split(',') if x.strip()]
                long_counts = Counter(long_genres)
                long_total = sum(long_counts.values())
                long_pct = {k: v / long_total * 100 for k, v in long_counts.items()}

                change_summary = []
                for genre in genre_df["Genre"]:
                    current = genre_df[genre_df["Genre"] == genre]["Percentage"].values[0]
                    past = long_pct.get(genre, 0)
                    delta = current - past
                    symbol = "🔺" if delta > 0 else ("🔻" if delta < 0 else "➖")
                    change_summary.append(f"{symbol} {genre}: {delta:+.1f}%")

                st.markdown("**Genre Change Compared to All Time:**")
                for change in change_summary:
                    st.markdown(f"- {change}")
        else:
            st.info("No genre data available for this term.")
else:
    st.info("Click '🔄 Load My Spotify Data' to view your personalized stats.")
