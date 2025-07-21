# 🎧 Spotify Listening Visualizer

This Streamlit web app connects with your Spotify account to visualize and analyze your listening habits. It displays your top tracks, genre preferences, and suggests new music based on your recent activity.

---

## 🔧 Features

- **Top Tracks Analysis**:
  - View your top 25 tracks for the last 4 weeks, 6 months, and 12 months.
  - Displays track names, artist names, and popularity rankings.

- **Genre Insights**:
  - Clean, interactive pie charts showing your genre distribution.
  - Filters out "Unknown" genres and combines less common genres into "Other."

- **Music Recommendations**:
  - Suggests 5 new songs based on your listening habits.
  - Provides preview links and fallback Spotify links if recommendation API fails.

- **Interactive Web Interface**:
  - Built with Streamlit for ease of use.
  - Data refresh button for quick updates.

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
  - Utilizes Pandas and Matplotlib to create readable tables and visual genre charts.
  - Categorizes listening behavior across short, medium, and long term periods.

- **Recommendation System**:
  - Uses Spotify’s recommendation engine with top seeds.
  - Fallback mechanism includes direct track links if API fails.

---

## 🧰 Tech Stack

- Python 3.12
- Streamlit
- Spotipy (Spotify Web API client)
- SQLite
- Matplotlib
- Pandas
- dotenv

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
- Create a `.env` file and add your credentials:
```env
SPOTIPY_CLIENT_ID=your_client_id
SPOTIPY_CLIENT_SECRET=your_client_secret
SPOTIPY_REDIRECT_URI=http://localhost:8888/callback
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
