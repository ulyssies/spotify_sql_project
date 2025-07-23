import os
import streamlit as st

# ─── On first visit, remove any old global DB ─────────────────────────────────
if "db_cleared" not in st.session_state:
    if os.path.exists("spotify_data.db"):
        os.remove("spotify_data.db")
    st.session_state.db_cleared = True

import sqlite3
import pandas as pd
from collections import Counter
from extract_spotify import extract_and_store_top_tracks
from suggestions import get_song_suggestions
import plotly.graph_objects as go
import spotipy
from spotipy.oauth2 import SpotifyOAuth
from secrets_handler import SPOTIPY_CLIENT_ID, SPOTIPY_CLIENT_SECRET, SPOTIPY_REDIRECT_URI

st.set_page_config(page_title="Spotify Statistics Visualizer", layout="centered")

# ─── Session-state defaults ─────────────────────────────────────────────────
for key, default in [
    ("sp", None),
    ("username", None),
    ("display_name", None),
    ("df", pd.DataFrame()),
    ("data_loaded", False),
]:
    if key not in st.session_state:
        st.session_state[key] = default

# ─── Spotify OAuth Flow ──────────────────────────────────────────────────────
if st.session_state.sp is None:
    auth_manager = SpotifyOAuth(
        client_id=SPOTIPY_CLIENT_ID,
        client_secret=SPOTIPY_CLIENT_SECRET,
        redirect_uri=SPOTIPY_REDIRECT_URI,
        scope="user-read-private user-top-read user-read-recently-played",
        cache_path=None,
        show_dialog=True,
    )

    params = st.experimental_get_query_params()
    if "code" in params:
        try:
            auth_manager.get_access_token(params["code"][0], as_dict=False)
            sp = spotipy.Spotify(auth_manager=auth_manager)
            user = sp.current_user()

            st.session_state.sp           = sp
            st.session_state.username     = user["id"]
            st.session_state.display_name = user.get("display_name", "User")

            # clear the URL and rerun
            st.experimental_set_query_params()
            st.experimental_rerun()

        except Exception as e:
            st.error(f"Login failed: {e}")
            st.stop()
    else:
        login_url = auth_manager.get_authorize_url()
        st.markdown("<h1 style='text-align:center;'>🎧 SpotYourVibe</h1>", unsafe_allow_html=True)
        st.markdown(
            f"<div style='text-align:center;'>"
            f"<a href='{login_url}'>"
            f"<button style='background-color:#1DB954;color:white;"
            f"padding:0.75rem 1.5rem;border:none;border-radius:30px;"
            f"font-size:1rem;'>🔐 Log in with Spotify</button>"
            f"</a></div>",
            unsafe_allow_html=True,
        )
        st.markdown(
            "<p style='text-align:center;color:gray;'>"
            "🔒 Spotify login required — no account data is stored."
            "</p>",
            unsafe_allow_html=True,
        )
        st.stop()

# ─── At this point, we have `sp`, `username`, and `display_name` ────────────
sp = st.session_state.sp

# ─── Time-range selector ─────────────────────────────────────────────────────
term_map = {
    "Last 4 Weeks": "short_term",
    "Last 6 Months": "medium_term",
    "All Time": "long_term",
}
term_label = st.selectbox("Top Tracks for:", list(term_map.keys()))
term = term_map[term_label]

# ─── Load & ETL button ───────────────────────────────────────────────────────
if st.button("🔄 Load My Spotify Data"):
    with st.spinner("Fetching your Spotify data..."):
        # refresh user in case token rotated
        user = sp.current_user()
        uid  = user["id"]
        name = user.get("display_name", "User")

        st.session_state.username     = uid
        st.session_state.display_name = name

        # extract and store *their* top tracks
        extract_and_store_top_tracks(sp, uid)

        # read back only their rows
        conn = sqlite3.connect("spotify_data.db")
        st.session_state.df = pd.read_sql_query(
            """
            SELECT track_name, artist_name, genre
            FROM top_tracks
            WHERE term = ? AND username = ?
            ORDER BY play_count ASC
            """,
            conn,
            params=(term, uid),
        )
        conn.close()

        st.session_state.data_loaded = True

    st.success(f"✅ Data loaded for {st.session_state.display_name}!")
    st.header(f"👋 Welcome, {st.session_state.display_name}!")

# ─── Render tabs only after data is loaded ──────────────────────────────────
if st.session_state.data_loaded and not st.session_state.df.empty:
    df = st.session_state.df
    tab1, tab2 = st.tabs(["🎵 Top Tracks", "📊 Genre Chart"])

    # ── Tab 1: Top Tracks ───────────────────────────────────────────────────
    with tab1:
        st.subheader(f"🎶 Top Tracks - {term_label}")
        disp = df.copy()
        disp.insert(0, "#", range(1, len(disp) + 1))
        disp = disp[["#", "track_name", "artist_name"]].rename(
            columns={"track_name": "Track", "artist_name": "Artist"}
        )
        st.dataframe(disp, use_container_width=True, hide_index=True)

        st.markdown("---")
        st.subheader("💡 Suggested Songs Based on Your Top Tracks")
        suggestions = get_song_suggestions(term, sp)
        if suggestions:
            for s in suggestions:
                name, artist, excerpt = s["track"], s["artist"], s["excerpt"]
                img, url = s.get("image", ""), s.get("url", "")
                c1, c2 = st.columns([1, 6])
                with c1:
                    if img:
                        st.image(img, width=96)
                    else:
                        st.markdown("🎵")
                with c2:
                    st.markdown(f"**{name}**  ")
                    st.markdown(f"*by {artist}*  ")
                    st.markdown(f"💬 [{name} by {artist} — Listen on Spotify]({url})")
                st.markdown("---")
        else:
            st.info("No song suggestions available. Try refreshing your data.")

    # ── Tab 2: Genre Chart ──────────────────────────────────────────────────
    with tab2:
        st.subheader(f"📊 Genre Distribution - {term_label}")
        genres = []
        for g in df["genre"]:
            if g and g != "Unknown":
                genres += [x.strip() for x in g.split(",") if x.strip()]
        counts = Counter(genres)
        total = sum(counts.values())
        gdf = pd.DataFrame(counts.items(), columns=["Genre", "Count"])
        gdf["Pct"] = gdf["Count"] / total * 100
        gdf = gdf.sort_values("Count", ascending=False).reset_index(drop=True)

        if not gdf.empty:
            fig = go.Figure(go.Bar(
                x=gdf["Genre"], y=gdf["Pct"],
                text=gdf["Pct"].apply(lambda x: f"{x:.1f}%"),
                textposition="auto",
                marker_color="rgb(30,215,96)",
            ))
            fig.update_layout(
                yaxis_title="Percentage (%)",
                xaxis_title="Genre",
                title=f"Genre Breakdown - {term_label}",
                height=500,
            )
            st.plotly_chart(fig, use_container_width=True)

            if term != "long_term":
                # compare vs all‐time
                conn = sqlite3.connect("spotify_data.db")
                long_df = pd.read_sql_query(
                    """
                    SELECT genre
                    FROM top_tracks
                    WHERE term = 'long_term'
                      AND username = ?
                      AND genre != 'Unknown'
                    """,
                    conn,
                    params=(st.session_state.username,),
                )
                conn.close()

                past_genres = []
                for g in long_df["genre"]:
                    past_genres += [x.strip() for x in g.split(",") if x.strip()]
                past_counts = Counter(past_genres)
                past_total = sum(past_counts.values())
                past_pct = {k: v / past_total * 100 for k, v in past_counts.items()}

                deltas = []
                for genre in gdf["Genre"]:
                    now = gdf[gdf["Genre"] == genre]["Pct"].iloc[0]
                    before = past_pct.get(genre, 0)
                    diff = now - before
                    sym = "🔺" if diff > 0 else ("🔻" if diff < 0 else "➖")
                    deltas.append(f"{sym} {genre}: {diff:+.1f}%")

                st.markdown("**Genre Change Compared to All Time:**")
                for d in deltas:
                    st.markdown(f"- {d}")
        else:
            st.info("No genre data available for this term.")

else:
    if not st.session_state.data_loaded:
        st.info("Click “🔄 Load My Spotify Data” to view your personalized stats.")

# ─── Debug: Download the raw DB file ────────────────────────────────────────
with open("spotify_data.db", "rb") as f:
    db_bytes = f.read()
st.download_button(
    label="📥 Download raw SQLite DB",
    data=db_bytes,
    file_name="spotify_data.db",
    mime="application/x-sqlite3",
)
