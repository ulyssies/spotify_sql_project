import os
import streamlit as st
from dotenv import load_dotenv

# Try loading from Streamlit secrets
try:
    SPOTIPY_CLIENT_ID = st.secrets["SPOTIPY_CLIENT_ID"]
    SPOTIPY_CLIENT_SECRET = st.secrets["SPOTIPY_CLIENT_SECRET"]
    SPOTIPY_REDIRECT_URI = st.secrets["SPOTIPY_REDIRECT_URI"]
except st.runtime.secrets.StreamlitSecretNotFoundError:
    # Load from .env file if not running on Streamlit Cloud
    load_dotenv()
    SPOTIPY_CLIENT_ID = os.getenv("SPOTIPY_CLIENT_ID")
    SPOTIPY_CLIENT_SECRET = os.getenv("SPOTIPY_CLIENT_SECRET")
    SPOTIPY_REDIRECT_URI = os.getenv("SPOTIPY_REDIRECT_URI")

# Optional: fail fast if missing
missing = [
    key for key, val in {
        "SPOTIPY_CLIENT_ID": SPOTIPY_CLIENT_ID,
        "SPOTIPY_CLIENT_SECRET": SPOTIPY_CLIENT_SECRET,
        "SPOTIPY_REDIRECT_URI": SPOTIPY_REDIRECT_URI
    }.items() if not val
]

if missing:
    st.error(f"Missing required Spotify credentials: {', '.join(missing)}")
    st.stop()
