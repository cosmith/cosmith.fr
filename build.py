import json
import os
import re
import shutil
import sys
from functools import cache

from jinja2 import Environment, PackageLoader, select_autoescape

TEMPLATE_DIR = "./templates"
DATA_DIR = "./data"

jinja_env = Environment(loader=PackageLoader("build"), autoescape=select_autoescape())


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

    # load templates and data
    pages = {}

    for filename in os.listdir(TEMPLATE_DIR):
        if ".html" in filename:
            pagename = filename.split(".")[0]
            pages[pagename] = {"template": filename, "data": None}

    for filename in os.listdir(DATA_DIR):
        if ".json" in filename:
            pagename = filename.split(".")[0]
            pages[pagename]["data"] = os.path.join(DATA_DIR, filename)

    for pagename, page in pages.items():
        print(f"rendering {pagename}")
        template = jinja_env.get_template(page["template"])

        if page["data"]:
            with open(page["data"]) as f:
                data = json.load(f)
                rendered = template.render(**data)
        else:
            rendered = template.render()

        full_page = layout.format(page=rendered)

        with open(f"build/{pagename}.html", "w") as f:
            f.write(full_page)
