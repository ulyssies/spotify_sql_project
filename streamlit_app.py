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

# Streamlit page configuration
st.set_page_config(page_title="Spotify Statistics Visualizer", layout="centered")

# Initialize session state
for key, default in {
    'sp': None,
    'username': None,
    'display_name': None,
    'df': pd.DataFrame(),
    'data_loaded': False,
}.items():
    if key not in st.session_state:
        st.session_state[key] = default

# Spotify OAuth login
if st.session_state.sp is None:
    auth_manager = SpotifyOAuth(
        client_id=SPOTIPY_CLIENT_ID,
        client_secret=SPOTIPY_CLIENT_SECRET,
        redirect_uri=SPOTIPY_REDIRECT_URI,
        scope="user-read-private user-top-read user-read-recently-played",
        cache_path=None,
        show_dialog=True
    )
    params = st.query_params
    if "code" in params:
        try:
            code = params["code"][0]
            auth_manager.get_access_token(code)
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
        login_url = auth_manager.get_authorize_url()
        st.markdown("<h1 style='text-align:center;'>Spotify Statistics Visualizer</h1>", unsafe_allow_html=True)
        st.markdown(f"""
<div style='background-color:rgba(0,0,0,0.6);padding:2rem;border-radius:1rem;text-align:center;'>
  <h1 style='font-size:2.5rem;'><strong>🎧 SpotYourVibe</strong></h1>
  <p>Personalized Spotify stats visualizer.<br>Log in to explore your top tracks, genres, and discover new music.</p>
  <a href='{login_url}'>
    <button style='margin-top:1rem;background-color:#1DB954;border:none;color:white;padding:0.75rem 1.5rem;border-radius:30px;font-weight:bold;font-size:1rem;'>
      🔐 Log in with Spotify
    </button>
  </a>
  <p style='margin-top:1rem;font-size:0.85rem;color:gray;'>🔒 Spotify login required — no account data is stored.</p>
</div>
""", unsafe_allow_html=True)
        st.stop()

# After login
sp = st.session_state.sp

# Time range selection
term_options = {
    "Last 4 Weeks": "short_term",
    "Last 6 Months": "medium_term",
    "All Time": "long_term"
}
term_label = st.selectbox("Top Tracks for:", list(term_options.keys()))
term = term_options[term_label]

# Load data button
def load_user_data():
    user = sp.current_user()
    uid = user["id"]
    name = user.get("display_name", "User")
    st.session_state.username = uid
    st.session_state.display_name = name

    # Use a per-user SQLite file
    db_path = f"spotify_data_{uid}.db"
    extract_and_store_top_tracks(sp, uid, db_path)

    conn = sqlite3.connect(db_path)
    df = pd.read_sql_query(
        "SELECT track_name, artist_name, genre FROM top_tracks WHERE term = ? AND username = ? ORDER BY play_count ASC",
        conn,
        params=(term, uid)
    )
    conn.close()
    st.session_state.df = df
    st.session_state.data_loaded = True

if st.button("🔄 Load My Spotify Data"):
    with st.spinner("Fetching your Spotify data..."):
        load_user_data()
    st.success(f"✅ Data loaded for {st.session_state.display_name}!")
    st.header(f"👋 Welcome, {st.session_state.display_name}!")

# Display metrics
if st.session_state.data_loaded and not st.session_state.df.empty:
    df = st.session_state.df
    tab1, tab2 = st.tabs(["🎵 Top Tracks", "📊 Genre Chart"])

    with tab1:
        st.subheader(f"🎶 Top Tracks - {term_label}")
        display_df = df.copy()
        display_df.insert(0, "#", range(1, len(display_df)+1))
        display_df = display_df[["#","track_name","artist_name"]].rename(
            columns={"track_name":"Track","artist_name":"Artist"}
        )
        st.dataframe(display_df, use_container_width=True, hide_index=True)
        st.markdown("---")
        st.subheader("💡 Suggested Songs Based on Your Top Tracks")
        suggestions = get_song_suggestions(term, sp)
        if suggestions:
            for s in suggestions:
                name, artist, excerpt = s["track"], s["artist"], s["excerpt"]
                image_url, url = s.get("image",""), s.get("url","")
                col1, col2 = st.columns([1,6])
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
            if g and g != "Unknown": genres += [x.strip() for x in g.split(',') if x.strip()]
        counts = Counter(genres)
        total = sum(counts.values())
        gdf = pd.DataFrame(counts.items(), columns=["Genre","Count"]).sort_values("Count", ascending=False)
        gdf["Pct"] = gdf["Count"]/total*100
        fig = go.Figure(go.Bar(
            x=gdf["Genre"], y=gdf["Pct"], text=gdf["Pct"].apply(lambda x: f"{x:.1f}%"), textposition='auto', marker_color='rgb(30,215,96)'
        ))
        fig.update_layout(yaxis_title="Percentage (%)", xaxis_title="Genre", title=f"Genre Breakdown - {term_label}", height=450)
        st.plotly_chart(fig, use_container_width=True)
        if term != "long_term":
            # Compare to all-time
            uid = st.session_state.username
            long_db = f"spotify_data_{uid}.db"
            conn = sqlite3.connect(long_db)
            long_df = pd.read_sql_query(
                "SELECT genre FROM top_tracks WHERE term='long_term' AND username = ?", conn, params=(uid,)
            )
            conn.close()
            long_genres=[]
            for g in long_df["genre"]:
                long_genres += [x.strip() for x in g.split(',') if x.strip()]
            lc = Counter(long_genres)
            lt = sum(lc.values())
            lp = {k:v/lt*100 for k,v in lc.items()}
            changes=[]
            for genre in gdf["Genre"]:
                curr = float(gdf[gdf["Genre"]==genre]["Pct"])
                past = lp.get(genre,0)
                d=curr-past
                sym = "🔺" if d>0 else ("🔻" if d<0 else "➖")
                changes.append(f"{sym} {genre}: {d:+.1f}%")
            st.markdown("**Genre Change Compared to All Time:**")
            for c in changes: st.markdown(f"- {c}")
else:
    st.info("Click '🔄 Load My Spotify Data' to view your personalized stats.")
