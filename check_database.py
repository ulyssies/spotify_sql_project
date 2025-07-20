import sqlite3

def print_table(cursor, table_name):
    print(f"\n--- {table_name.upper()} ---")
    cursor.execute(f"SELECT * FROM {table_name} LIMIT 10")  # Only show 10 for brevity
    rows = cursor.fetchall()
    for row in rows:
        print(row)

def main():
    conn = sqlite3.connect("spotify_data.db")
    cursor = conn.cursor()

    # Print the structure of the tables
    print("\n=== TABLE NAMES ===")
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()
    for table in tables:
        print(table[0])

    # Print sample data from key tables
    if ("top_tracks",) in tables:
        print_table(cursor, "top_tracks")
    if ("artists",) in tables:
        print_table(cursor, "artists")

    conn.close()

if __name__ == "__main__":
    main()
