import os
import streamlit as st
import sqlite3
import pandas as pd
from collections import Counter
from extract_spotify import extract_and_store_top_tracks
from suggestions import get_song_suggestions
import plotly.graph_objects as go
import spotipy
from spotipy.oauth2 import SpotifyOAuth
from secrets_handler import SPOTIPY_CLIENT_ID, SPOTIPY_CLIENT_SECRET, SPOTIPY_REDIRECT_URI

# Page setup
st.set_page_config(page_title="Spotify Statistics Visualizer", layout="centered")

# Initialize session state
def init_state(key, default):
    if key not in st.session_state:
        st.session_state[key] = default

init_state('sp', None)
init_state('username', None)
init_state('display_name', None)
init_state('df', pd.DataFrame())
init_state('data_loaded', False)
init_state('last_term', None)

# OAuth login setup
auth_manager = SpotifyOAuth(
    client_id=SPOTIPY_CLIENT_ID,
    client_secret=SPOTIPY_CLIENT_SECRET,
    redirect_uri=SPOTIPY_REDIRECT_URI,
    scope="user-read-private user-top-read user-read-recently-played",
    cache_path=None,
    show_dialog=True
)
params = st.query_params

# Handle Spotify redirect with code\if "code" in params:
    try:
        code = params['code'][0]
        auth_manager.get_access_token(code, as_dict=False)
        sp = spotipy.Spotify(auth_manager=auth_manager)
        user = sp.current_user()
        st.session_state.sp = sp
        st.session_state.username = user['id']
        st.session_state.display_name = user.get('display_name', 'User')
        # clear code param and rerun app
        st.query_params = {}
        st.rerun()
    except Exception as e:
        st.error(f"Login failed: {e}")
        st.stop()
else:
    # Show login UI
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

# After login, load main app
sp = st.session_state.sp
st.header(f"👋 Welcome, {st.session_state.display_name}!")

# Time range selection
term_map = {"Last 4 Weeks": "short_term", "Last 6 Months": "medium_term", "All Time": "long_term"}
term_label = st.selectbox("Top Tracks for:", list(term_map.keys()))
term = term_map[term_label]

# Re-query if term changed after load
if st.session_state.data_loaded and st.session_state.last_term != term:
    uid = st.session_state.username
    db = f"spotify_data_{uid}.db"
    conn = sqlite3.connect(db)
    st.session_state.df = pd.read_sql_query(
        "SELECT track_name, artist_name, genre FROM top_tracks WHERE term = ? AND username = ? ORDER BY play_count ASC",
        conn,
        params=(term, uid)
    )
    conn.close()
    st.session_state.last_term = term

# Data loader function
def load_user_data():
    user = sp.current_user()
    uid = user['id']
    name = user.get('display_name','User')
    st.session_state.username = uid
    st.session_state.display_name = name
    db = f"spotify_data_{uid}.db"
    extract_and_store_top_tracks(sp, uid, db)
    # Debug: row count
    conn_dbg = sqlite3.connect(db)
    count = conn_dbg.execute("SELECT COUNT(*) FROM top_tracks WHERE username=?", (uid,)).fetchone()[0]
    conn_dbg.close()
    st.write(f"⚙️ Rows in {db}: {count}")
    # Load DataFrame
    conn = sqlite3.connect(db)
    df = pd.read_sql_query(
        "SELECT track_name, artist_name, genre FROM top_tracks WHERE term = ? AND username = ? ORDER BY play_count ASC",
        conn, params=(term, uid)
    )
    conn.close()
    st.session_state.df = df
    st.session_state.data_loaded = True
    st.session_state.last_term = term

# Load data button
if st.button("🔄 Load My Spotify Data"):
    with st.spinner("Fetching Spotify data..."):
        load_user_data()
    st.success(f"✅ Data loaded for {st.session_state.display_name}!")

# Display charts
if st.session_state.data_loaded and not st.session_state.df.empty:
    df = st.session_state.df
    tab1, tab2 = st.tabs(["🎵 Top Tracks","📊 Genre Chart"])
    with tab1:
        st.subheader(f"🎶 Top Tracks - {term_label}")
        disp = df.copy()
        disp.insert(0,'#',range(1,len(disp)+1))
        disp = disp[['#','track_name','artist_name']].rename(columns={'track_name':'Track','artist_name':'Artist'})
        st.dataframe(disp,use_container_width=True,hide_index=True)
        st.markdown("---")
        st.subheader("💡 Suggested Songs Based on Your Top Tracks")
        suggestions = get_song_suggestions(term,sp)
        if suggestions:
            for s in suggestions:
                name, artist, excerpt = s['track'],s['artist'],s['excerpt']
                img, url = s.get('image',''),s.get('url','')
                c1, c2 = st.columns([1,6])
                with c1:
                    st.image(img,width=96) if img else st.markdown("🎵")
                with c2:
                    st.markdown(f"**{name}**  ")
                    st.markdown(f"*by {artist}*  ")
                    st.markdown(f"💬 [{name} by {artist} — Listen on Spotify]({url})")
                st.markdown("---")
        else:
            st.info("No song suggestions available.")
    with tab2:
        st.subheader(f"📊 Genre Distribution - {term_label}")
        genres = [g.strip() for g in df['genre'].dropna() if g!='Unknown' for g in g.split(',')]
        cnt = Counter(genres)
        gdf = pd.DataFrame(cnt.items(),columns=['Genre','Count']).sort_values('Count',ascending=False)
        total = gdf['Count'].sum()
        gdf['Pct'] = gdf['Count']/total*100
        fig = go.Figure(go.Bar(x=gdf['Genre'],y=gdf['Pct'],text=gdf['Pct'].apply(lambda x:f"{x:.1f}%"),textposition='auto',marker_color='rgb(30,215,96)'))
        fig.update_layout(yaxis_title='Percentage (%)',xaxis_title='Genre',title=f'Genre Breakdown - {term_label}',height=450)
        st.plotly_chart(fig,use_container_width=True)
        if term!='long_term':
            uid = st.session_state.username
            conn_lt = sqlite3.connect(f"spotify_data_{uid}.db")
            ldf = pd.read_sql_query("SELECT genre FROM top_tracks WHERE term='long_term' AND username=?",conn_lt,params=(uid,))
            conn_lt.close()
            lg = [g.strip() for g in ldf['genre'].dropna() if g!='Unknown' for g in g.split(',')]
            lc = Counter(lg)
            lt = sum(lc.values()) or 1
            lpct={k:v/lt*100 for k,v in lc.items()}
            changes=[]
            for genre in gdf['Genre']:
                cur=float(gdf.loc[gdf['Genre']==genre,'Pct'])
                past=lpct.get(genre,0)
                d=cur-past
                sym='🔺' if d>0 else ('🔻' if d<0 else '➖')
                changes.append(f"{sym} {genre}: {d:+.1f}%")
            st.markdown("**Genre Change Compared to All Time:**")
            for c in changes: st.markdown(f"- {c}")
else:
    st.info("Click '🔄 Load My Spotify Data' to view your personalized stats.")
