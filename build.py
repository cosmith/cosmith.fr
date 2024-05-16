import argparse
import http.server
import os
import shutil
import socketserver
import sqlite3
import markdown

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(ROOT_DIR, "data.db")
BUILD_DIR = os.path.join(ROOT_DIR, "build")
SOURCE_DIR = os.path.join(ROOT_DIR, "src")
STATIC_DIRS = ["css", "img"]


def load_layout(dev_mode=False):
    with open(os.path.join(SOURCE_DIR, "index.html"), "r") as f:
        layout = f.read()

    return layout


def execute_query(query):
    """Helper function to execute a query and fetch results from the SQLite database."""
    try:
        conn = sqlite3.connect(DB_PATH)
        with conn:
            cur = conn.cursor()
            cur.execute(query)
            results = cur.fetchall()
        return results
    except sqlite3.Error as e:
        print(f"An error occurred: {e}")
        return []
    finally:
        if conn:
            conn.close()


def get_pages():
    return execute_query("SELECT slug, content FROM pages")


def get_projects():
    return execute_query("SELECT title, slug, description FROM projects")


def render_markdown(content, layout):
    html = markdown.markdown(content, extensions=["fenced_code", "codehilite"])
    return layout.format(page=html)


def save_html(slug, html, subdirectory=""):
    if subdirectory:
        os.makedirs(os.path.join(BUILD_DIR, subdirectory), exist_ok=True)

    html_path = os.path.join(BUILD_DIR, subdirectory, f"{slug}.html")
    with open(html_path, "w") as f:
        f.write(html)


def build_website(layout):
    shutil.rmtree(BUILD_DIR, ignore_errors=True)

    # copy static files
    for static_dir in STATIC_DIRS:
        shutil.copytree(
            os.path.join(SOURCE_DIR, static_dir), os.path.join(BUILD_DIR, static_dir)
        )

    pages = get_pages()
    for slug, content in pages:
        print(f"rendering {slug}")
        html = render_markdown(content, layout)
        save_html(slug, html)

    projects = get_projects()
    for title, slug, description in projects:
        print(f"rendering {slug}")
        md = f"# {title}\n\n{description}"
        html = render_markdown(md, layout)
        save_html(slug, html, subdirectory="projects")


class RewriteUrlsHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        # Rewrite the URL for .html files.
        if self.path.endswith("/"):
            self.path += "index.html"
        elif not any(
            self.path.endswith(x)
            for x in [".html", ".js", ".css", ".png", ".jpg", ".jpeg", ".gif"]
        ):
            self.path += ".html"
        return http.server.SimpleHTTPRequestHandler.do_GET(self)


def serve_website(port=8000):
    os.chdir(BUILD_DIR)
    handler = RewriteUrlsHTTPRequestHandler

    with socketserver.TCPServer(("", port), handler, bind_and_activate=False) as httpd:
        httpd.allow_reuse_address = True
        httpd.server_bind()
        httpd.server_activate()

        print(f"Serving on http://localhost:{port}/ from {BUILD_DIR}")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down the server...")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Build and serve a static website with live reloading."
    )
    parser.add_argument("--dev", action="store_true", help="Enable development mode.")
    parser.add_argument(
        "--serve", action="store_true", help="Serve the website after building."
    )
    parser.add_argument(
        "--port",
        type=int,
        default=8000,
        help="Port to serve the website on (default: 8000).",
    )

    args = parser.parse_args()

    layout = load_layout(args.dev)
    build_website(layout)

    if args.serve:
        serve_website(args.port)
