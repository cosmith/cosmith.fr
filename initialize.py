import sqlite3


def initialize_db():
    # Connect to the SQLite database
    conn = sqlite3.connect("data.db")
    cursor = conn.cursor()

    # Create pages table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS pages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            slug TEXT NOT NULL,
            content TEXT NOT NULL
        )
    """)

    # Create projects table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            slug TEXT NOT NULL,
            image TEXT NOT NULL,
            description TEXT NOT NULL
        )
    """)

    # Create updates table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS updates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            created_at TEXT NOT NULL,
            content TEXT NOT NULL,
            FOREIGN KEY (project_id) REFERENCES projects (id)
        )
    """)

    # Commit the changes and close the connection
    conn.commit()
    conn.close()


# Initialize the database
initialize_db()
