import os
import subprocess
import sys


ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(ROOT_DIR)


def main():
    # Transitional shim for older build commands. Prefer `npm run build`.
    command = ["npm", "run", "build:site", "--", *sys.argv[1:]]
    raise SystemExit(subprocess.run(command, cwd=PROJECT_DIR).returncode)


if __name__ == "__main__":
    main()
