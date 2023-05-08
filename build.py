import argparse
import http.server
import os
import re
import shutil
import socketserver
import markdown

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
BUILD_DIR = os.path.join(ROOT_DIR, "build")
SOURCE_DIR = os.path.join(ROOT_DIR, "src")
PAGES_DIR = os.path.join(SOURCE_DIR, "pages")


def load_layout(dev_mode=False):
    with open(os.path.join(SOURCE_DIR, "index.html"), "r") as f:
        layout = f.read()

        if dev_mode:
            layout = re.sub(
                r'href="\./([a-z]+)"', r'href="./\1.html"', layout, re.MULTILINE
            )
    return layout


def build_website(layout):
    shutil.rmtree(BUILD_DIR, ignore_errors=True)
    os.makedirs(BUILD_DIR)
    shutil.copytree(os.path.join(SOURCE_DIR, "css"), os.path.join(BUILD_DIR, "css"))

    for filename in os.listdir(PAGES_DIR):
        if not filename.endswith(".md"):
            continue

        pagename, _ = os.path.splitext(filename)
        print(f"rendering {pagename}")

        with open(os.path.join(PAGES_DIR, filename)) as f:
            md = f.read()
        html = markdown.markdown(md)

        full_page = layout.format(page=html)
        html_path = os.path.join(BUILD_DIR, f"{pagename}.html")
        with open(html_path, "w") as f:
            f.write(full_page)


def serve_website(port=8000):
    os.chdir(BUILD_DIR)
    handler = http.server.SimpleHTTPRequestHandler

    with socketserver.TCPServer(("", port), handler, bind_and_activate=False) as httpd:
        httpd.allow_reuse_address = True
        httpd.server_bind()
        httpd.server_activate()

        print(f"Serving on port {port} from {BUILD_DIR}")
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
