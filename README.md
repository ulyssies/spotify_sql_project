<div align="center">

# 🎧 SpotYourVibe

**A Spotify statistics visualizer that transforms your listening history into interactive insights.**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-spoturvibe.streamlit.app-1DB954?style=for-the-badge&logo=streamlit&logoColor=white)](https://spoturvibe.streamlit.app/)
[![Python](https://img.shields.io/badge/Python-3.12+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-22c55e?style=for-the-badge)](LICENSE)

</div>

---

## Overview

SpotYourVibe connects to your Spotify account and turns your listening data into meaningful visualizations — top tracks across multiple time windows, genre distribution trends, and personalized song recommendations, all backed by a lightweight ETL pipeline and a local SQLite database.

---

## Features

| Feature | Description |
|---|---|
| 🎵 **Top Tracks** | View your top 25 tracks across 4-week, 6-month, and all-time windows |
| 📊 **Genre Insights** | Interactive bar charts with hover tooltips and +/− trend comparisons |
| ✨ **Recommendations** | 5 personalized suggestions with album art, previews, and Spotify links |
| 🔄 **ETL Pipeline** | Extracts, normalizes, and stores enriched track + genre metadata in SQLite |
| 🔑 **Flexible Auth** | Supports both local `.env` and Streamlit Cloud `secrets.toml` |
| ⚡ **Live Sync** | One-click data refresh to pull your latest Spotify activity |

---

## Tech Stack

[![Streamlit](https://img.shields.io/badge/Streamlit-FF4B4B?style=flat-square&logo=streamlit&logoColor=white)](https://streamlit.io)
[![Spotipy](https://img.shields.io/badge/Spotipy-1DB954?style=flat-square&logo=spotify&logoColor=white)](https://github.com/plamere/spotipy)
[![Pandas](https://img.shields.io/badge/Pandas-150458?style=flat-square&logo=pandas&logoColor=white)](https://pandas.pydata.org)
[![Plotly](https://img.shields.io/badge/Plotly-3F4F75?style=flat-square&logo=plotly&logoColor=white)](https://plotly.com)
[![SQLite](https://img.shields.io/badge/SQLite-003B57?style=flat-square&logo=sqlite&logoColor=white)](https://sqlite.org)
[![Matplotlib](https://img.shields.io/badge/Matplotlib-11557c?style=flat-square)](https://matplotlib.org)

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/ulyssies/spotify-visualizer.git
cd spotify-visualizer
```

### 2. Set up a virtual environment

```bash
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Create a Spotify Developer App

Go to the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard), create an app, and note your **Client ID**, **Client Secret**, and **Redirect URI**.

Then configure your credentials depending on your environment:

<table>
<tr>
<th>Local — <code>.env</code></th>
<th>Streamlit Cloud — <code>secrets.toml</code></th>
</tr>
<tr>
<td>

```env
SPOTIPY_CLIENT_ID=your_client_id
SPOTIPY_CLIENT_SECRET=your_client_secret
SPOTIPY_REDIRECT_URI=http://localhost:8501
```

</td>
<td>

```toml
[spotify]
SPOTIPY_CLIENT_ID="your_client_id"
SPOTIPY_CLIENT_SECRET="your_client_secret"
SPOTIPY_REDIRECT_URI="https://your-app.streamlit.app"
```

</td>
</tr>
</table>

> For Streamlit Cloud, add these under **Settings → Secrets** in your app dashboard.

### 5. Run the app

```bash
streamlit run streamlit_app.py
```

---

## Data Pipeline

The app runs a lightweight ETL process on each refresh:

1. **Extract** — pulls top tracks and recently played data from the Spotify Web API
2. **Transform** — enriches tracks with artist genre metadata, deduplicates, and normalizes
3. **Load** — stores results in a local SQLite database for fast querying
4. **Visualize** — renders Plotly bar charts, Matplotlib pie charts, and recommendation cards from the stored data

---

## Deployment

This project is ready to deploy on [Streamlit Cloud](https://streamlit.io/cloud) with no code changes. Just connect your GitHub repo, set your secrets under **Settings → Secrets**, and deploy.

---

## Acknowledgments

- [Spotify Web API](https://developer.spotify.com/documentation/web-api/)
- [Streamlit](https://streamlit.io/)
- [Spotipy](https://github.com/plamere/spotipy)

---

<div align="center">
<sub>MIT License · Built with Python 3.12+</sub>
</div>
