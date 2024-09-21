import argparse
import http.server
import os
import shutil
import socketserver
import sqlite3
import markdown
import threading
import time
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

# Constants and configuration
ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(ROOT_DIR, "data.db")
BUILD_DIR = os.path.join(ROOT_DIR, "build")
SOURCE_DIR = os.path.join(ROOT_DIR, "src")
STATIC_DIRS = ["css", "img"]


def load_layout_template():
    """Load the HTML layout template from the source directory."""
    with open(os.path.join(SOURCE_DIR, "index.html"), "r") as f:
        return f.read()


class Database:
    """Handles database operations."""

    def __init__(self, db_path):
        self.db_path = db_path

    def execute_query(self, query, params=()):
        """Execute a SQL query and return the results."""
        try:
            conn = sqlite3.connect(self.db_path)
            with conn:
                cur = conn.cursor()
                cur.execute(query, params)
                return cur.fetchall()
        except sqlite3.Error as e:
            print(f"An error occurred: {e}")
            return []
        finally:
            if conn:
                conn.close()

    def get_pages(self):
        """Retrieve all pages from the database."""
        return self.execute_query("SELECT slug, content FROM pages")

    def get_projects(self):
        """Retrieve all projects from the database."""
        return self.execute_query(
            "SELECT id, title, slug, description, image FROM projects ORDER BY id DESC"
        )

    def get_updates(self, project_id):
        """Retrieve updates for a specific project."""
        return self.execute_query(
            """SELECT created_at, content, GROUP_CONCAT(attachments.url) as attachment_urls
               FROM updates
               LEFT JOIN attachments ON updates.id = attachments.update_id
               WHERE project_id = ?
               GROUP BY updates.id
               ORDER BY created_at ASC""",
            (project_id,),
        )

    def get_latest_updates(self, count):
        """Retrieve the latest updates across all projects."""
        return self.execute_query(
            """SELECT updates.created_at, projects.title, projects.slug, updates.content, GROUP_CONCAT(attachments.url) as attachment_urls
               FROM updates
               JOIN projects ON updates.project_id = projects.id
               LEFT JOIN attachments ON updates.id = attachments.update_id
               GROUP BY updates.id, projects.title, projects.slug, updates.content
               ORDER BY updates.created_at DESC, updates.id DESC
               LIMIT ?""",
            (count,),
        )


class Renderer:
    """Handles rendering of markdown content into HTML."""

    def __init__(self, layout_template, build_id):
        self.layout_template = layout_template
        self.build_id = build_id

    def render_markdown(self, content):
        """Convert markdown content to HTML and insert into the layout."""
        html_content = markdown.markdown(
            content, extensions=["fenced_code", "codehilite"]
        )
        return self.layout_template.format(page=html_content, build_id=self.build_id)

    def render_update_project(self, created_at, content, attachment_urls):
        """Render a project's update into markdown."""
        md = f"## {created_at}\n\n{content}\n\n"
        if attachment_urls:
            for url in attachment_urls.split(","):
                md += f'<a href="{url}" target="_blank"><img src="{url}" /></a>\n\n'
        return md

    def render_update_build_log(
        self, created_at, project_title, project_slug, content, attachment_urls
    ):
        """Render an update for the build log."""
        md = f"## {created_at} - [{project_title}](/projects/{project_slug})\n\n{content}\n\n"
        if attachment_urls:
            for url in attachment_urls.split(","):
                md += f'<a href="{url}" target="_blank"><img class="attachment-thumb" src="{url}" /></a>\n\n'
        return md


class Builder:
    """Builds the static website from templates and database content."""

    def __init__(self, db, renderer, build_dir, source_dir, static_dirs, build_id):
        self.db = db
        self.renderer = renderer
        self.build_dir = build_dir
        self.source_dir = source_dir
        self.static_dirs = static_dirs
        self.build_id = build_id

    def build_website(self):
        """Orchestrate the website build process."""
        shutil.rmtree(self.build_dir, ignore_errors=True)
        self.copy_static_files()
        self.build_pages()
        self.build_project_pages()
        self.build_project_index()
        self.build_build_log()
        print("Website build completed.")

    def copy_static_files(self):
        """Copy static files and append build ID to CSS and JS files."""
        for static_dir in self.static_dirs:
            shutil.copytree(
                os.path.join(self.source_dir, static_dir),
                os.path.join(self.build_dir, static_dir),
                dirs_exist_ok=True,
            )

        # Rename CSS and JS files to include the build ID
        for static_dir in ["css"]:
            dir_path = os.path.join(self.build_dir, static_dir)
            for filename in os.listdir(dir_path):
                if filename.endswith(".css") or filename.endswith(".js"):
                    name, ext = os.path.splitext(filename)
                    new_filename = f"{name}.{self.build_id}{ext}"
                    os.rename(
                        os.path.join(dir_path, filename),
                        os.path.join(dir_path, new_filename),
                    )

    def build_pages(self):
        """Build static pages from the database."""
        pages = self.db.get_pages()
        for slug, content in pages:
            print(f"Rendering page: {slug}")
            html = self.renderer.render_markdown(content)
            self.save_html(slug, html)

    def build_project_pages(self):
        """Build individual project pages."""
        projects = self.db.get_projects()
        for project in projects:
            project_id, title, slug, description, image = project
            print(f"Rendering project: {slug}")
            md = f"# {title}\n\n"
            md += f'<img class="project-cover" src="{image}" />\n\n{description}\n'
            updates = self.db.get_updates(project_id)
            for update in updates:
                md += self.renderer.render_update_project(*update)
            html = self.renderer.render_markdown(md)
            self.save_html(slug, html, subdirectory="projects")

    def build_project_index(self):
        """Build the index page for all projects."""
        projects = self.db.get_projects()
        project_links = []
        for project_id, title, slug, description, image in projects:
            project_links.append(
                f"""## [{title}](/projects/{slug})\n\n<a href="/projects/{slug}"><img class="project-cover" src="{image}"/></a>\n"""
            )
        md = f"# Projects\n\n{''.join(project_links)}"
        html = self.renderer.render_markdown(md)
        self.save_html("index", html, subdirectory="projects")

    def build_build_log(self):
        """Build the build log page with the latest updates."""
        updates = self.db.get_latest_updates(20)
        md = "# Build log\n\n"
        for update in updates:
            md += self.renderer.render_update_build_log(*update)
        html = self.renderer.render_markdown(md)
        self.save_html("index", html, subdirectory="build-log")

    def save_html(self, slug, html, subdirectory=""):
        """Save rendered HTML to the build directory."""
        path = os.path.join(self.build_dir, subdirectory)
        os.makedirs(path, exist_ok=True)
        html_path = os.path.join(path, f"{slug}.html")
        with open(html_path, "w") as f:
            f.write(html)


class RewriteUrlsHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    """Custom HTTP request handler to rewrite URLs for static files."""

    def do_GET(self):
        # Rewrite the URL for .html files.
        if self.path.endswith("/"):
            self.path += "index.html"
        elif not any(
            self.path.endswith(ext)
            for ext in [".html", ".js", ".css", ".png", ".jpg", ".jpeg", ".gif"]
        ):
            self.path += ".html"
        return super().do_GET()


def serve_website(port=8000):
    """Serve the website using a custom HTTP server."""
    handler_class = RewriteUrlsHTTPRequestHandler

    class ThreadedTCPServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
        pass

    with ThreadedTCPServer(("", port), handler_class) as httpd:
        httpd.allow_reuse_address = True
        os.chdir(BUILD_DIR)
        print(f"Serving on http://localhost:{port}/ from {BUILD_DIR}")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down the server...")


class ChangeHandler(FileSystemEventHandler):
    """Handles file system events to trigger a website rebuild."""

    def __init__(self, db, renderer, builder):
        super().__init__()
        self.db = db
        self.renderer = renderer
        self.builder = builder
        self.build_lock = threading.Lock()
        self.build_requested = False

    def on_any_event(self, event):
        if event.is_directory:
            return
        print(f"Detected change: {event.src_path}")
        with self.build_lock:
            if not self.build_requested:
                self.build_requested = True
                threading.Thread(target=self.rebuild).start()

    def rebuild(self):
        with self.build_lock:
            print("Rebuilding website...")
            # Generate new build_id
            build_id = os.urandom(4).hex()
            # Reload layout
            layout_template = load_layout_template()
            # Reinitialize renderer and builder with new build_id
            self.renderer = Renderer(layout_template, build_id)
            self.builder.build_id = build_id
            self.builder.renderer = self.renderer
            self.builder.build_website()
            print("Rebuild complete.")
            self.build_requested = False


def watch_files(db, renderer, builder):
    """Watch for file changes and trigger rebuilds."""
    event_handler = ChangeHandler(db, renderer, builder)
    observer = Observer()
    observer.schedule(event_handler, path=SOURCE_DIR, recursive=True)
    observer.schedule(event_handler, path=os.path.dirname(DB_PATH), recursive=False)
    observer.start()
    print("Started watching for file changes...")
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
    observer.join()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Build and serve the website with live reloading."
    )
    parser.add_argument(
        "--dev",
        action="store_true",
        help="Enable development mode with live reloading.",
    )
    parser.add_argument(
        "--serve", action="store_true", help="Serve the website after building."
    )
    parser.add_argument(
        "--port",
        type=int,
        default=9000,
        help="Port to serve the website on (default: 9000).",
    )

    args = parser.parse_args()

    # Generate a random build ID to reset caching when changing static files
    build_id = os.urandom(4).hex()

    # Load layout template
    layout_template = load_layout_template()

    # Initialize database, renderer, and builder
    db = Database(DB_PATH)
    renderer = Renderer(layout_template, build_id)
    builder = Builder(db, renderer, BUILD_DIR, SOURCE_DIR, STATIC_DIRS, build_id)

    # Build the website
    builder.build_website()

    if args.dev:
        print("Development mode enabled. Watching for changes...")
        # Start file watcher
        watcher_thread = threading.Thread(
            target=watch_files, args=(db, renderer, builder), daemon=True
        )
        watcher_thread.start()

    if args.dev or args.serve:
        serve_website(args.port)
