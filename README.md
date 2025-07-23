# 🎧 SpotYourVibe — Spotify Statistics Visualizer

This Streamlit web app connects with your Spotify account to visualize and analyze your listening habits. It displays your top tracks, genre preferences, and suggests new music based on your recent activity.

Now compatible with both local development using `.env` and Streamlit Cloud deployment using `secrets.toml`.

👉 [Live Demo](https://spoturvibe.streamlit.app/)

---

## 🔧 Features

- **Top Tracks Analysis**:
  - View your top 25 tracks for the last 4 weeks, 6 months, and all time.
  - Displays track names, artist names, and popularity rankings.

- **Genre Insights**:
  - Clean, interactive bar charts showing your genre distribution.
  - Hoverable tooltips with percentage values.
  - +/− summary comparing recent vs. all-time genre changes.

- **Music Recommendations**:
  - Suggests 5 new songs based on your top listening data.
  - Fallback to recently played tracks if needed.
  - Shows album art, excerpts, and Spotify links.

- **Smart Secrets Handling**:
  - Supports both local `.env` and cloud `secrets.toml` config for seamless deployment.

- **Interactive Web Interface**:
  - Built with Streamlit for a responsive, modern UI.
  - Personalized login page with dynamic content.
  - Data refresh button for real-time Spotify sync.

---

## 📊 Data Processing & Insights

This app does more than display Spotify data — it transforms it into meaningful insights. Key components:

- **ETL Process**:
  - Extracts top and recent track data using the Spotify Web API.
  - Transforms with genre metadata.
  - Loads results into SQLite database.

- **Data Enrichment**:
  - Normalizes and deduplicates track data.
  - Supplements with recent plays if needed.
  - Uses artist metadata to enrich with genre.

- **Visualization**:
  - Matplotlib for pie charts and Plotly for interactive bar charts.
  - Categorizes listening behavior over multiple time periods.

- **Recommendation Engine**:
  - Uses Spotify’s API with top tracks as seeds.
  - Provides clickable excerpts and Spotify preview links.

---

## 🧰 Tech Stack

- Python 3.12+
- Streamlit
- Spotipy
- SQLite
- Matplotlib
- Pandas
- Plotly
- `python-dotenv`

---

## 🚀 Getting Started

### 1. Clone this repository
```bash
git clone https://github.com/ulyssies/spotify-visualizer.git
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
- Create an app and get your Client ID, Secret, and Redirect URI

- For local development, create a `.env` file:
```env
SPOTIPY_CLIENT_ID=your_client_id
SPOTIPY_CLIENT_SECRET=your_client_secret
SPOTIPY_REDIRECT_URI=http://localhost:8501
```

- For Streamlit Cloud, go to `⚙️ Settings > Secrets` and add:
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