import streamlit as st
import sqlite3
import pandas as pd

def get_top_tracks(term):
    conn = sqlite3.connect("top_tracks.db")
    query = f"""
        SELECT track_name, artist_name, genre, play_count
        FROM top_tracks
        WHERE term = ?
        ORDER BY play_count DESC
        LIMIT 25
    """
    df = pd.read_sql_query(query, conn, params=(term,))
    conn.close()
    return df

def display_tracks(df, term):
    st.markdown(f"### 🎧 Your Top 25 Tracks ({term.replace('_', ' ').title()})")

    for idx, row in df.iterrows():
        st.markdown(f"""
        **{idx+1}. {row['track_name']}**  
        *Artist:* {row['artist_name']}  
        *Genre:* {row['genre'] or 'Unknown'}  
        *Play Count:* {row['play_count']}  
        ---
        """)
