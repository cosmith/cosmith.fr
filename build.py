import json
import os
import shutil
from functools import cache


@cache
def get_page(filename):
    with open(f"./pages/{filename}.html") as f:
        return f.read()

@cache
def get_component(filename):
    with open(f"./components/{filename}.html") as f:
        return f.read()

@cache
def get_data(filename):
    with open(f"./data/{filename}.json") as f:
        return json.load(f)

with open("index.html", "r") as index:
    text = index.read()

shutil.rmtree("build")
os.makedirs("build")
shutil.copytree("css", "build/css")
for pagename in ["about", "links"]:
    page = get_page(pagename)
    
    if pagename == "links":
        link_component = get_component("link")
        links_data = get_data("links")
        print((links_data[0]))
        links = [link_component.format(**link) for link in links_data]
        links_html = "\n".join(links)
        page = page.format(links=links_html)

    out = text.format(page=page)

    with open(f"build/{pagename}.html", "w") as f:
        f.write(out)
