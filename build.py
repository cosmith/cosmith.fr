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


def load_layout(build_id):
    with open(os.path.join(SOURCE_DIR, "index.html"), "r") as f:
        layout = f.read()

    return layout.replace("{build_id}", build_id)


def execute_query(query, params=()):
    """Helper function to execute a query and fetch results from the SQLite database."""
    try:
        conn = sqlite3.connect(DB_PATH)
        with conn:
            cur = conn.cursor()
            cur.execute(query, params)
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
    return execute_query(
        "SELECT id, title, slug, description, image FROM projects ORDER BY id DESC"
    )


def get_updates(project_id):
    return execute_query(
        """SELECT created_at, content, GROUP_CONCAT(attachments.url) as attachment_urls
        FROM updates
        LEFT JOIN attachments ON updates.id = attachments.update_id
        WHERE project_id = ?
        GROUP BY updates.id
        ORDER BY created_at ASC""",
        (project_id,),
    )


def get_latest_updates(count):
    return execute_query(
        """SELECT updates.created_at, projects.title, projects.slug, updates.content, GROUP_CONCAT(attachments.url) as attachment_urls
        FROM updates
        JOIN projects ON updates.project_id = projects.id
        LEFT JOIN attachments ON updates.id = attachments.update_id
        GROUP BY updates.id, projects.title, projects.slug, updates.content
        ORDER BY updates.created_at DESC, updates.id DESC
        LIMIT ?""",
        (count,),
    )


def render_markdown(content, layout):
    html = markdown.markdown(content, extensions=["fenced_code", "codehilite"])
    return layout.format(page=html)


def save_html(slug, html, subdirectory=""):
    if subdirectory:
        os.makedirs(os.path.join(BUILD_DIR, subdirectory), exist_ok=True)

    html_path = os.path.join(BUILD_DIR, subdirectory, f"{slug}.html")
    with open(html_path, "w") as f:
        f.write(html)


def render_update_project(created_at, content, attachment_urls):
    md = f"## {created_at}\n\n{content}\n\n"
    if attachment_urls:
        for url in attachment_urls.split(","):
            md += f'<a href="{url}" target="_blank"><img src="{url}" /></a>\n\n'
    return md


def render_update_build_log(
    created_at, project_title, project_slug, content, attachment_urls
):
    md = f"## {created_at} - [{project_title}](/projects/{project_slug})\n\n{content}\n\n"
    if attachment_urls:
        for url in attachment_urls.split(","):
            md += f'<a href="{url}" target="_blank"><img class="attachment-thumb" src="{url}" /></a>\n\n'
    return md


def copy_static_files(build_id):
    for static_dir in STATIC_DIRS:
        shutil.copytree(
            os.path.join(SOURCE_DIR, static_dir), os.path.join(BUILD_DIR, static_dir)
        )

    # rename css and js files to include the build ID
    for static_dir in ["css"]:
        for filename in os.listdir(os.path.join(BUILD_DIR, static_dir)):
            if filename.endswith(".css") or filename.endswith(".js"):
                parts = filename.split(".")
                new_filename = f"{parts[0]}.{build_id}.{parts[1]}"
                os.rename(
                    os.path.join(BUILD_DIR, static_dir, filename),
                    os.path.join(BUILD_DIR, static_dir, new_filename),
                )


def build_website(layout, build_id):
    shutil.rmtree(BUILD_DIR, ignore_errors=True)

    # copy static files
    copy_static_files(build_id)

    # build "static" pages
    pages = get_pages()
    for slug, content in pages:
        print(f"rendering {slug}")
        html = render_markdown(content, layout)
        save_html(slug, html)

    # build project pages
    projects = get_projects()

    project_links = []
    for project_id, title, slug, description, image in projects:
        print(f"rendering {slug}")
        md = f"# {title}\n\n{description}\n\n" + "".join(
            render_update_project(created_at, content, attachment_urls)
            for created_at, content, attachment_urls in get_updates(project_id)
        )
        html = render_markdown(md, layout)
        save_html(slug, html, subdirectory="projects")

    # project index page
    for project_id, title, slug, description, image in projects:
        project_links.append(
            f"""## [{title}]({slug})\n\n<a href="{slug}"><img class="project-cover" src="{image}"/></a>\n"""
        )
    project_list = "".join(project_links)
    project_index_md = f"# Projects\n\n{project_list}"
    project_index_html = render_markdown(project_index_md, layout)
    save_html("index", project_index_html, subdirectory="projects")

    # build log page
    updates = get_latest_updates(20)
    log_md = "# Build log\n\n"
    for created_at, project_title, project_slug, content, attachment_urls in updates:
        log_md += render_update_build_log(
            created_at, project_title, project_slug, content, attachment_urls
        )
    log_html = render_markdown(log_md, layout)
    save_html("index", log_html, subdirectory="build-log")


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
        default=9000,
        help="Port to serve the website on (default: 9000).",
    )

    args = parser.parse_args()

    # generate a random build id to reset caching when changing static files
    build_id = os.urandom(4).hex()
    layout = load_layout(build_id)
    build_website(layout, build_id)

    if args.serve:
        serve_website(args.port)
