import markdown
import os
import re
import shutil
import sys


PAGES_DIR = "./pages"


if __name__ == "__main__":
    dev = len(sys.argv) > 1 and sys.argv[1] == "dev"

    with open("index.html", "r") as f:
        layout = f.read()

        if dev:
            layout = re.sub(
                r'href="\./([a-z]+)"', r'href="./\1.html"', layout, re.MULTILINE
            )

    # create build directory
    shutil.rmtree("build")
    os.makedirs("build")
    shutil.copytree("css", "build/css")

    # load pages
    pages = {}

    for filename in os.listdir(PAGES_DIR):
        if ".md" not in filename:
            continue

        pagename = filename.split(".")[0]
        print(f"rendering {pagename}")

        with open(os.path.join(PAGES_DIR, filename)) as f:
            md = f.read()
        html = markdown.markdown(md)

        full_page = layout.format(page=html)

        with open(f"build/{pagename}.html", "w") as f:
            f.write(full_page)
