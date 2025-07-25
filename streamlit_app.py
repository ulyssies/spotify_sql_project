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

# Show load button always
if st.button("🔄 Load My Spotify Data"):
    with st.spinner("Fetching your Spotify data..."):
        user = sp.current_user()
        st.session_state.username = user["id"]
        st.session_state.display_name = user.get("display_name", "User")
        extract_and_store_top_tracks(sp, username, user_db)
        st.success(f"✅ Data loaded for {st.session_state.display_name}!")
        st.session_state.data_loaded = True

# Always load the current time frame data from DB if already loaded
if st.session_state.data_loaded:
    conn = sqlite3.connect(user_db)
    st.session_state.df = pd.read_sql_query(
        "SELECT track_name, artist_name, genre FROM top_tracks WHERE term = ? AND username = ? ORDER BY play_count ASC",
        conn,
        params=(term, username)
    )
    conn.close()

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
        suggestions = get_song_suggestions(term, sp, username=username, db_path=user_db)

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

            if term != "long_term":
                long_df = pd.read_sql_query(
                    "SELECT genre FROM top_tracks WHERE genre != 'Unknown' AND term = 'long_term' AND username = ?",
                    sqlite3.connect(user_db),
                    params=(username,)
                )
                long_genres = [g.strip() for g in long_df["genre"] for g in g.split(',') if g.strip()]
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
