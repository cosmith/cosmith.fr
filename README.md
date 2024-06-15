[cosmith.fr](https://cosmith.fr)
=============================
Personal website 

See https://cosmith.fr/projects/this-website for more info!

## Requirements

- Install with `pip install -r requirements.txt`.

## Usage

1. **Build the Website**

    Run the script without any arguments to build the website. This will convert all Markdown files in the `src/pages` directory to HTML, apply the layout template, and copy static assets to the `build` directory.

    ```
    python build.py
    ```

2. **Serve the Website Locally**

    To build the website and serve it locally on a specified port (default is 8000), use the `--serve` flag.

    ```
    python build.py --serve
    ```

    Optionally, specify the port with `--port`:

    ```
    python build.py --serve --port 8080
    ```

3. **Development Mode**

    Enable development mode with the `--dev` flag. This mode can be combined with `--serve` to facilitate live reloading.

    ```
    python build.py --dev --serve
    ```
