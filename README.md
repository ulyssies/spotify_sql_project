# 🎵 Spotify SQL Tracker

Spotify SQL Tracker is a personal data project that connects to the Spotify Web API, collects your top tracks and recently played songs, and stores them in a SQL database. It then provides simplified visualizations and insights into your music history and listening preferences using Python and SQL.

---

## 🧠 Why I Built This

I wanted to create a clean and accessible way for users (including myself) to explore their **Spotify listening history** and **audio preferences** through visual data. By combining **APIs**, **SQL**, and **data visualization**, this project demonstrates how to:
- Collect data from a real-world API (Spotify)
- Store it properly in a relational database
- Analyze patterns in listening habits
- Present meaningful results in an easy-to-understand way

This is a great example of using data engineering and analysis skills to produce insights that are **both personal and shareable**.

---

## 🛠️ Tech Stack

- **Python 3.12**
- **Spotipy** – Spotify API wrapper for Python
- **SQLite** – Lightweight SQL database for storing tracks
- **SQLAlchemy** – Database integration with Python
- **Pandas** – Data wrangling and manipulation
- **Matplotlib / Seaborn** – Graphs and visualizations
- **dotenv** – For secure API key storage

---

## 🚀 Setup Instructions

1. **Clone the repository**
```bash
git clone https://github.com/ulyssies/spotify_sql_project.git
cd spotify_sql_project
```

2. **Create a virtual environment**
```bash
python3 -m venv venv
source venv/bin/activate
```

3. **Install dependencies**
```bash
pip install -r requirements.txt
```

4. **Set up your `.env` file**
Create a `.env` file in the project root and add:
```
SPOTIPY_CLIENT_ID=your_client_id
SPOTIPY_CLIENT_SECRET=your_client_secret
SPOTIPY_REDIRECT_URI=http://localhost:8888/callback
```

5. **Run the pipeline**
```bash
python extract_spotify.py   # Fetch top tracks from Spotify
python load_data.py         # Save track data into SQLite
python analyze.py           # Run queries & show visualizations
```

---

## 📁 Folder Structure

```
spotify_sql_project/
├── README.md              # Project overview and setup instructions
├── requirements.txt       # Python dependencies
├── extract_spotify.py     # Authenticates and fetches Spotify data
├── create_database.py     # Creates SQLite schema and tables
├── check_database.py      # Optional: script to inspect/verify DB contents
├── genres.py              # Extracts or analyzes genre-related data
├── spotify_data.db        # SQLite database with track data (auto-generated)
├── .env                   # (User-created) Stores API keys — NOT committed to Git
└── venv/                  # Virtual environment (excluded from version control)
```

---

## 👤 Author

**Ulyssies Adams**  
🎓 B.S. in Computer Science, Georgia State University  
💼 [LinkedIn](https://www.linkedin.com/in/ulyssiesadams/)  
💻 [GitHub](https://github.com/ulyssies)  

---

## 📄 License

This project is for educational and personal use. Feel free to fork, contribute, or build upon it.