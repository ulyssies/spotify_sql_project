import sqlite3
import matplotlib.pyplot as plt
from collections import Counter

# Database file
db_file = "spotify_data.db"

# Parameters
top_n = 6  # Number of top genres to show individually

# Fetch and plot genres for the given time range
def fetch_and_plot_genres(time_range):
    conn = sqlite3.connect(db_file)
    cursor = conn.cursor()

    # Fetch genres for the given time range, excluding "Unknown"
    cursor.execute("""
        SELECT genre FROM top_tracks
        WHERE genre != 'Unknown' AND term = ?
    """, (time_range,))
    rows = cursor.fetchall()
    conn.close()

    genres = []
    for row in rows:
        if row[0]:  # skip empty values
            genres += [g.strip() for g in row[0].split(',') if g.strip()]

    genre_counts = Counter(genres)

    # Group less frequent genres into "Other"
    top_genres = dict(genre_counts.most_common(top_n))
    other_count = sum(count for genre, count in genre_counts.items() if genre not in top_genres)
    if other_count > 0:
        top_genres["Other"] = other_count

    # Plot pie chart
    plt.figure(figsize=(8, 6))
    plt.pie(
        top_genres.values(),
        labels=top_genres.keys(),
        autopct='%1.1f%%',
        startangle=140
    )
    plt.title(f"Top Genres - {time_range.replace('_', ' ').title()}")
    plt.axis("equal")
    plt.tight_layout()
    plt.show()

# Generate charts for all time ranges
for term in ["short_term", "medium_term", "long_term"]:
    fetch_and_plot_genres(term)
