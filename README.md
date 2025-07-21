# 🎧 Spotify Listening Visualizer

This Streamlit web app connects with your Spotify account to visualize and analyze your listening habits. It displays your top tracks, genre preferences, and suggests new music based on your recent activity. Now compatible with both local development using `.env` and Streamlit Cloud deployment using `secrets.toml`.

---

## 🔧 Features

- **Top Tracks Analysis**:
  - View your top 25 tracks for the last 4 weeks, 6 months, and all time.
  - Displays track names, artist names, and popularity rankings.

- **Genre Insights**:
  - Clean, interactive pie charts showing your genre distribution.
  - Filters out "Unknown" genres and combines less common genres into "Other."

- **Music Recommendations**:
  - Suggests 5 new songs based on your top listening data.
  - Includes fallback to recently played tracks if needed.
  - Shows preview links and album art, with direct links to Spotify if preview unavailable.

- **Smart Secrets Handling**:
  - Supports both local `.env` and cloud `secrets.toml` config for seamless deployment.

- **Interactive Web Interface**:
  - Built with Streamlit for a responsive, accessible UI.
  - Data refresh button for quick Spotify sync.

---

## 📊 Data Processing & Insights

This app does more than display Spotify data — it transforms it into meaningful insights. Key data components include:

- **ETL Process**:
  - Extracts top and recent track data using the Spotify Web API.
  - Transforms data by cleaning, validating, and enhancing with genre metadata.
  - Loads structured results into a local SQLite database.

- **Data Enrichment & Cleaning**:
  - Normalizes and deduplicates track data.
  - Supplements incomplete results with recently played tracks.
  - Uses Spotify artist metadata to enhance each entry with genre classification.

- **Visualization**:
  - Utilizes Pandas and Matplotlib to create readable tables and genre pie charts.
  - Categorizes listening behavior across short, medium, and long term periods.

- **Recommendation System**:
  - Uses Spotify’s recommendation engine with validated top tracks as seeds.
  - Falls back gracefully to recent tracks and direct Spotify links if needed.

---

## 🧰 Tech Stack

- Python 3.12+
- Streamlit
- Spotipy (Spotify Web API client)
- SQLite
- Matplotlib
- Pandas
- `python-dotenv`

---

## 🚀 Getting Started

### 1. Clone this repository
```bash
git clone https://github.com/yourusername/spotify-visualizer.git
cd spotify-visualizer
```

### 2. Set up a virtual environment
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows use `venv\Scripts\activate`
```

### 3. Install dependencies
```bash
pip install -r requirements.txt
```

### 4. Set up Spotify Developer App
- Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
- Create an app and get your `Client ID`, `Client Secret`, and `Redirect URI`
- For **local development**, create a `.env` file:
```env
SPOTIPY_CLIENT_ID=your_client_id
SPOTIPY_CLIENT_SECRET=your_client_secret
SPOTIPY_REDIRECT_URI=http://localhost:8888/callback
```
- For **Streamlit Cloud**, go to `⚙️ Settings > Secrets` and add:
```toml
[spotify]
SPOTIPY_CLIENT_ID="your_client_id"
SPOTIPY_CLIENT_SECRET="your_client_secret"
SPOTIPY_REDIRECT_URI="https://your-deployed-url.streamlit.app"
```

### 5. Run the app
```bash
streamlit run streamlit_app.py
```

---

## 📝 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙌 Acknowledgments
- [Spotify Web API](https://developer.spotify.com/documentation/web-api/)
- [Streamlit](https://streamlit.io/)
- [Spotipy](https://github.com/plamere/spotipy)
