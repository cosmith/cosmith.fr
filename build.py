import os
import shutil


def get_page(filename):
    with open(filename) as f:
        return f.read()


with open("index.html", "r") as index:
    text = index.read()

shutil.rmtree("build")
os.makedirs("build")
shutil.copytree("css", "build/css")
for filename in ["about", "links"]:
    page = get_page(f"pages/{filename}.html")
    out = text.replace("{{page}}", page)
    with open(f"build/{filename}.html", "w") as f:
        f.write(out)
