# 🎧 Spotify SQL Tracker

Analyze your Spotify listening habits using Python, Spotipy, SQL, and Data Visualization. This project extracts your top tracks and artists using the Spotify Web API, stores the data in an SQLite database, and produces insightful charts and SQL-driven reports.

## 🧠 Project Purpose

I created this project to provide music lovers and data enthusiasts with a clean, interactive way to explore their Spotify listening history. It’s a portfolio piece that demonstrates API integration, SQL querying, and data visualization — all tied together in a simple, readable workflow.

---

## 🚀 Features

- Authenticates via Spotify OAuth
- Fetches top tracks, artists, and audio features
- Stores structured data in SQLite
- Visualizes trends (e.g. genres, danceability, popularity)
- Performs SQL analysis on stored data

---

## 🛠️ Setup Instructions

1. **Clone this repository**
```bash
git clone https://github.com/ulyssies/spotify_sql_project.git
cd spotify_sql_project
```

2. **Create your `.env` file** using the provided `.env.example`

3. **Create and activate your virtual environment**
```bash
python3 -m venv venv
source venv/bin/activate
```

4. **Install dependencies**
```bash
pip install -r requirements.txt
```

5. **Run the extractor**
```bash
python extract_spotify.py
```

6. **Create the database**
```bash
python create_database.py
```

7. **Visualize or analyze your data**
```bash
python check_database.py
python genres.py
```

---

## 📁 Folder Structure

```
spotify_sql_project/
├── README.md
├── .env.example
├── requirements.txt
├── extract_spotify.py
├── create_database.py
├── check_database.py
├── genres.py
├── spotify_data.db
├── visuals/              # (Optional) Visual output folder
└── venv/                 # Virtual environment (excluded from Git)
```

---

## 🔐 .env File

This project uses environment variables for your Spotify credentials.  
Use the provided `.env.example` to create your own `.env` file:

```env
SPOTIPY_CLIENT_ID=your_client_id_here
SPOTIPY_CLIENT_SECRET=your_client_secret_here
SPOTIPY_REDIRECT_URI=http://127.0.0.1:8888/callback
```

---

## 🧑‍💻 Author

**Ulyssies Adams**  
[GitHub](https://github.com/ulyssies) • 
[LinkedIn](https://www.linkedin.com/in/ulyssiesadams/)

---

## 📄 License

This project is licensed under the MIT License.
