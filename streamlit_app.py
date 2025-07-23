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
import os

# Set page config
st.set_page_config(page_title="Spotify Statistics Visualizer", layout="centered")

if "sp" not in st.session_state:
    st.session_state.sp = None

# --- Ensure database and tables exist ---
def ensure_database_exists(sp, username):
    db_exists = os.path.exists("spotify_data.db")
    if not db_exists:
        with st.spinner("Initializing your database..."):
            extract_and_store_top_tracks(sp, username)

# Spotify login
if st.session_state.sp is None:
    auth_manager = SpotifyOAuth(
        client_id=SPOTIPY_CLIENT_ID,
        client_secret=SPOTIPY_CLIENT_SECRET,
        redirect_uri=SPOTIPY_REDIRECT_URI,
        scope="user-read-private user-top-read user-read-recently-played",
        cache_path=None,
        show_dialog=True
    )

    query_params = st.query_params
    if "code" in query_params:
        try:
            code = query_params["code"][0]
            token_info = auth_manager.get_access_token(code, as_dict=False)
            sp = spotipy.Spotify(auth_manager=auth_manager)
            user = sp.current_user()
            st.session_state.sp = sp
            st.session_state.username = user.get("display_name", "Your")
            st.query_params.clear()
            st.rerun()
        except Exception as e:
            st.error(f"Login failed: {e}")
            st.stop()
    else:
        st.markdown("<h1 style='text-align: center;'>Spotify Statistics Visualizer</h1>", unsafe_allow_html=True)
        st.markdown(
            """
            <div style='background-color: rgba(0,0,0,0.6); padding: 2rem; border-radius: 1rem; text-align: center;'>
                <h1 style='font-size: 2.5rem;'>
                    <span style='font-weight: bold;'>
                        🎧 SpotYourVibe
                    </span>
                </h1>
                <p>This is a personalized Spotify stats visualizer.<br>Log in to explore your top tracks, genres, and discover new music.</p>
                <a href='{}'>
                    <button style='margin-top: 1rem; background-color: #1DB954; border: none; color: white; padding: 0.75rem 1.5rem; border-radius: 30px; font-weight: bold; font-size: 1rem;'>
                        🔐 Log in with Spotify
                    </button>
                </a>
                <p style='margin-top: 1rem; font-size: 0.85rem; color: gray;'>🔒 Spotify login required — no account data is stored.</p>
            </div>
            """.format(auth_manager.get_authorize_url()),
            unsafe_allow_html=True
        )
        st.stop()

# Post-login
sp = st.session_state.sp
username = st.session_state.username
st.header(f"Welcome, {username}!")

# Ensure DB is created before querying
ensure_database_exists(sp, username)

# Load user data
if st.button("🔄 Load My Spotify Data"):
    with st.spinner("Fetching your Spotify data..."):
        extract_and_store_top_tracks(sp, username)
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
    "SELECT track_name, artist_name, genre FROM top_tracks WHERE term = ? AND username = ? ORDER BY play_count ASC",
    conn, params=(term, username)
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
