import sqlite3
import datetime


def add_build_log(project_id, created_at, content, attachment_urls):
    # Connect to the SQLite database
    conn = sqlite3.connect("data.db")
    cursor = conn.cursor()

    # Insert a new record into the updates table
    cursor.execute(
        """
        INSERT INTO updates (project_id, created_at, content)
        VALUES (?, ?, ?)
    """,
        (project_id, created_at, content),
    )

    # Commit the changes and close the connection
    conn.commit()
    conn.close()


# add a new record for today
today = datetime.datetime.now().strftime("%Y-%m-%d")
add_build_log(
    3,
    today,
    """This update was created from [Github Actions](https://github.com/cosmith/cosmith.fr/blob/8af6b056efc10ef43a23a7b8abb528be25f18c80/.github/workflows/add-build-log.yml).
I'm trying to find a way to make it easy to add new updates to projects without having to manually update the database.
The action is launched using `workflow_dispatch` which can be triggered by an API call. My goal is to create a small mobile app that can be used to send quick updates to Github directly, and have the action commit them.
Unfortunately I can't send the images that way... But it's good to know it's possible to create commits from actions.
""",
    [],
)
