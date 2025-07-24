# --- Reference: Previous Working `streamlit_app.py` and `extract_spotify.py` preserved ---
# Streamlit App using user-specific database

# === streamlit_app.py ===

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

# Session state init
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
            sp = spotipy.Spotify(auth_manager=auth_manager)
            user = sp.current_user()
            st.session_state.sp = sp
            st.session_state.username = user["id"]
            st.session_state.display_name = user.get("display_name", "User")
            st.query_params.clear()
            st.rerun()
        except Exception as e:
            st.error(f"Login failed: {e}")
            st.stop()
    else:
        st.markdown("<h1 style='text-align: center;'>Spotify Statistics Visualizer</h1>", unsafe_allow_html=True)
        st.markdown(f"""
            <div style='background-color: rgba(0,0,0,0.6); padding: 2rem; border-radius: 1rem; text-align: center;'>
                <h1 style='font-size: 2.5rem;'><span style='font-weight: bold;'>🎧 SpotYourVibe</span></h1>
                <p>This is a personalized Spotify stats visualizer.<br>Log in to explore your top tracks, genres, and discover new music.</p>
                <a href='{auth_manager.get_authorize_url()}'>
                    <button style='margin-top: 1rem; background-color: #1DB954; border: none; color: white; padding: 0.75rem 1.5rem; border-radius: 30px; font-weight: bold; font-size: 1rem;'>🔐 Log in with Spotify</button>
                </a>
                <p style='margin-top: 1rem; font-size: 0.85rem; color: gray;'>🔒 Spotify login required — no account data is stored.</p>
            </div>
        """, unsafe_allow_html=True)
        st.stop()

sp = st.session_state.sp
username = st.session_state.username
user_db = f"spotify_{username}.db"
display_name = st.session_state.display_name

term_options = {
    "Last 4 Weeks": "short_term",
    "Last 6 Months": "medium_term",
    "All Time": "long_term"
}
term_label = st.selectbox("Top Tracks for:", list(term_options.keys()))
term = term_options[term_label]

if st.button("🔄 Load My Spotify Data"):
    with st.spinner("Fetching your Spotify data..."):
        user = sp.current_user()
        st.session_state.username = user["id"]
        st.session_state.display_name = user.get("display_name", "User")

        extract_and_store_top_tracks(sp, username, user_db)

        conn = sqlite3.connect(user_db)
        st.session_state.df = pd.read_sql_query(
            "SELECT track_name, artist_name, genre FROM top_tracks WHERE term = ? ORDER BY play_count ASC",
            conn,
            params=(term,)
        )
        conn.close()
        st.session_state.data_loaded = True
    st.success(f"✅ Data loaded for {display_name}!")
    st.header(f"👋 Welcome, {display_name}!")

if st.session_state.data_loaded and not st.session_state.df.empty:
    df = st.session_state.df
    tab1, tab2 = st.tabs(["🎵 Top Tracks", "📊 Genre Chart"])

    with tab1:
        st.subheader(f"🎶 Top Tracks - {term_label}")
        df_display = df.copy()
        df_display.insert(0, "#", range(1, len(df_display) + 1))
        df_display = df_display[["#", "track_name", "artist_name"]].rename(columns={"track_name": "Track", "artist_name": "Artist"})
        st.dataframe(df_display, use_container_width=True, hide_index=True)

        st.markdown("---")
        st.subheader("💡 Suggested Songs Based on Your Top Tracks")
        suggestions = get_song_suggestions(term, sp)

        if suggestions:
            for s in suggestions:
                with st.container():
                    col1, col2 = st.columns([1, 6])
                    with col1:
                        if s.get("image"):
                            st.image(s["image"], width=96)
                        else:
                            st.markdown("🎵")
                    with col2:
                        st.markdown(f"**{s['track']}**  ")
                        st.markdown(f"*by {s['artist']}*  ")
                        st.markdown(f"💬 [{s['track']} by {s['artist']} — Listen on Spotify]({s['url']})")
                st.markdown("---")
        else:
            st.info("No song suggestions available. Try refreshing your data.")

    with tab2:
        st.subheader(f"📊 Genre Distribution - {term_label}")
        genres = [g.strip() for g in df["genre"] if g and g != "Unknown" for g in g.split(',')]
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


# === extract_spotify.py ===

import sqlite3
import time

def extract_and_store_top_tracks(sp, username, db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS top_tracks (
            track_id    TEXT,
            track_name  TEXT,
            artist_name TEXT,
            genre       TEXT,
            term        TEXT,
            play_count  INTEGER,
            PRIMARY KEY (track_id, term)
        )
    """)
    conn.commit()

    def get_artist_genres(artist_id):
        try:
            return ', '.join(sp.artist(artist_id).get('genres', [])) or 'Unknown'
        except:
            return 'Unknown'

    def insert_for_term(term):
        seen = set()
        count = 0

        for item in sp.current_user_top_tracks(limit=50, time_range=term).get("items", []):
            if count >= 25: break
            tid = item["id"]
            if tid in seen: continue
            seen.add(tid)
            cursor.execute("""
                INSERT OR REPLACE INTO top_tracks (track_id, track_name, artist_name, genre, term, play_count)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                tid,
                item["name"],
                item["artists"][0]["name"],
                get_artist_genres(item["artists"][0]["id"]),
                term,
                count + 1
            ))
            count += 1

        if count < 25:
            for rec in sp.current_user_recently_played(limit=50).get("items", []):
                if count >= 25: break
                tid = rec["track"]["id"]
                if tid in seen: continue
                seen.add(tid)
                cursor.execute("""
                    INSERT OR REPLACE INTO top_tracks (track_id, track_name, artist_name, genre, term, play_count)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (
                    tid,
                    rec["track"]["name"],
                    rec["track"]["artists"][0]["name"],
                    get_artist_genres(rec["track"]["artists"][0]["id"]),
                    term,
                    count + 1
                ))
                count += 1

        conn.commit()

    for t in ["short_term", "medium_term", "long_term"]:
        insert_for_term(t)
        time.sleep(1.5)

    conn.close()
    print(f"✅ Wrote user-specific data for {username} into {db_path}")
