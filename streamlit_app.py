import os
import streamlit as st
import sqlite3
import pandas as pd
import matplotlib.pyplot as plt
from collections import Counter
from extract_spotify import extract_and_store_top_tracks
from suggestions import get_song_suggestions
import spotipy
from spotipy.oauth2 import SpotifyOAuth
from secrets_handler import SPOTIPY_CLIENT_ID, SPOTIPY_CLIENT_SECRET, SPOTIPY_REDIRECT_URI

# Page configuration
st.set_page_config(page_title="Spotify Statistics Visualizer", layout="centered")

# Initialize session state with defaults
for key, default in {
    'sp': None,
    'username': None,
    'display_name': None,
    'df': None,
    'data_loaded': False
}.items():
    if key not in st.session_state:
        st.session_state[key] = default

# OAuth manager setup
auth_manager = SpotifyOAuth(
    client_id=SPOTIPY_CLIENT_ID,
    client_secret=SPOTIPY_CLIENT_SECRET,
    redirect_uri=SPOTIPY_REDIRECT_URI,
    scope="user-read-private user-top-read user-read-recently-played",
    cache_path=None,
    show_dialog=True
)

# --- OAuth Flow ---
if st.session_state.sp is None:
    if 'code' in st.query_params:
        try:
            auth_manager.get_access_token(st.query_params['code'][0], as_dict=False)
            sp = spotipy.Spotify(auth_manager=auth_manager)
            user = sp.current_user()
            st.session_state.sp = sp
            st.session_state.username = user['id']
            st.session_state.display_name = user.get('display_name', 'User')
            st.query_params = {}
            st.experimental_rerun()
        except Exception as e:
            st.error(f"Login failed: {e}")
            st.stop()
    else:
        login_url = auth_manager.get_authorize_url()
        st.markdown(f"<h1><a href='{login_url}'>🔐 Log in with Spotify</a></h1>", unsafe_allow_html=True)
        st.stop()

# --- After Login ---
sp = st.session_state.sp

# Show welcome header once data is loaded

# Time range selector
term_map = {
    'Last 4 Weeks': 'short_term',
    'Last 6 Months': 'medium_term',
    'All Time': 'long_term'
}
term_label = st.selectbox("Top Tracks for:", list(term_map.keys()))
term = term_map[term_label]

# Load data button triggers ETL into per-user DB
if st.button("🔄 Load My Spotify Data"):
    with st.spinner("Fetching your Spotify data..."):
        uid = st.session_state.username
        name = st.session_state.display_name
        db_file = f'spotify_data_{uid}.db'

        # ETL for this user
        extract_and_store_top_tracks(sp, uid, db_file)

        # Query their data
        conn = sqlite3.connect(db_file)
        df = pd.read_sql_query(
            "SELECT track_name, artist_name, genre FROM top_tracks "
            "WHERE term = ? AND username = ? ORDER BY play_count ASC", 
            conn, params=(term, uid)
        )
        conn.close()

        st.session_state.df = df
        st.session_state.data_loaded = True

    # Confirmation & greeting
    st.success(f"✅ Data loaded for {name}!")
    st.header(f"👋 Welcome, {name}!")

# Display results if loaded
if st.session_state.data_loaded and isinstance(st.session_state.df, pd.DataFrame) and not st.session_state.df.empty:
    df = st.session_state.df
    tab1, tab2 = st.tabs(["🎵 Top Tracks", "📊 Genre Chart"])

    # Tab 1: Top Tracks + Suggestions
    with tab1:
        st.subheader(f"🎶 Top Tracks - {term_label}")
        df_display = df.copy()
        df_display.insert(0, "#", range(1, len(df_display) + 1))
        df_display = df_display.rename(columns={
            'track_name': 'Track',
            'artist_name': 'Artist'
        })[["#", "Track", "Artist"]]
        st.dataframe(df_display, use_container_width=True, hide_index=True)
        st.markdown("---")
        st.subheader("💡 Suggested Songs Based on Your Top Tracks")
        suggestions = get_song_suggestions(term, sp)
        if suggestions:
            for s in suggestions:
                cols = st.columns([1, 5])
                with cols[0]:
                    if s.get('image'):
                        st.image(s['image'], width=64)
                    else:
                        st.markdown("🎵")
                with cols[1]:
                    st.markdown(f"**{s['track']}**")
                    st.markdown(f"*by {s['artist']}*")
                    if s.get('url'):
                        st.markdown(f"[Listen on Spotify]({s['url']})")
                st.markdown("---")
        else:
            st.info("No suggestions available. Try reloading your data.")

    # Tab 2: Genre Chart + Change vs All Time
    with tab2:
        st.subheader(f"📊 Genre Distribution - {term_label}")
        # Build counts for selected term
        genres = [g.strip() for row in df['genre'].dropna() for g in row.split(',') if g.strip().lower() != 'unknown']
        counts = Counter(genres)
        top6 = dict(counts.most_common(6))
        other = sum(v for k,v in counts.items() if k not in top6)
        if other:
            top6['Other'] = other

        # Plot pie
        if top6:
            fig, ax = plt.subplots()
            ax.pie(top6.values(), labels=top6.keys(), autopct='%1.1f%%', startangle=140)
            ax.axis('equal')
            st.pyplot(fig)
        else:
            st.info("No genre data available.")

        # If not 'All Time', compute change vs long_term
        if term != 'long_term':
            uid = st.session_state.username
            long_db = f'spotify_data_{uid}.db'
            conn = sqlite3.connect(long_db)
            long_df = pd.read_sql_query(
                "SELECT genre FROM top_tracks WHERE term = 'long_term' AND username = ? AND genre IS NOT NULL", 
                conn, params=(uid,)
            )
            conn.close()
            long_genres = [g.strip() for row in long_df['genre'] for g in row.split(',') if g.strip().lower() != 'unknown']
            long_counts = Counter(long_genres)
            lt_total = sum(long_counts.values())
            long_pct = {k: (v/lt_total*100) for k,v in long_counts.items()}

            # Summarize changes
            changes = []
            for genre, pct in counts.items():
                curr_pct = pct / sum(counts.values()) * 100
                prev_pct = long_pct.get(genre, 0)
                delta = curr_pct - prev_pct
                sym = '🔺' if delta>0 else ('🔻' if delta<0 else '➖')
                changes.append(f"{sym} {genre}: {delta:+.1f}%")
            st.markdown("**Change vs All Time:**")
            for line in changes:
                st.markdown(f"- {line}")

else:
    st.info("Click '🔄 Load My Spotify Data' to view your personalized stats.")
