[cosmith.fr](https://cosmith.fr)
=============================
Personal website 

See https://cosmith.fr/projects/this-website for more info!

## Requirements

- Node 24.
- Install Node dependencies with `npm install`.
- Install Python dependencies with `pip install -r requirements.txt`.

## Usage

1. **Build the Website**

    Run the build script to render content from InstantDB, apply the layout template, and copy static assets to the `build` directory.

    ```
    npm run build
    ```

2. **Serve the Website Locally**

    To build the website and serve it locally on a specified port (default is 8000), use the `--serve` flag.

    ```
    npm run serve
    ```

    Optionally, specify the port with `--port`:

    ```
    npm run serve -- --port 8080
    ```

3. **Development Mode**

    Enable development mode with the `--dev` flag. This mode can be combined with `--serve` to facilitate live reloading.

    ```
    npm run dev
    ```

4. **Content-triggered Deploys**

    Cloudflare Pages deploys can be triggered whenever InstantDB content changes. The setup script creates or reuses a Cloudflare Pages deploy hook for `main`, then registers an InstantDB webhook for `pages`, `projects`, `updates`, and `attachments`.

    ```
    npm run setup:content-deploy-hook
    ```
