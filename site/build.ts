import { program } from 'commander';
import { watch } from 'chokidar';
import { createServer } from 'http';
import { readFile, writeFile, mkdir, cp, readdir, rename, rm } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname, extname, basename } from 'path';
import { fileURLToPath } from 'url';
import { randomBytes } from 'crypto';
import { spawnSync } from 'child_process';
import db from '../src/admin-db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ROOT_DIR = __dirname;
const BUILD_DIR = join(ROOT_DIR, 'build');
const SOURCE_DIR = join(ROOT_DIR, 'src');
const STATIC_DIRS = ['css', 'img'];
const PROJECT_DIR = dirname(ROOT_DIR);
const VENV_PYTHON = join(PROJECT_DIR, '.venv', 'bin', 'python');
const PYTHON = existsSync(VENV_PYTHON) ? VENV_PYTHON : 'python3';

type BuildPaths = {
  buildDir: string;
  sourceDir: string;
  staticDirs: string[];
};

type BuildConfig = BuildPaths & {
  buildId: string;
  layoutTemplate: string;
};

async function loadLayoutTemplate(): Promise<string> {
  return await readFile(join(SOURCE_DIR, 'index.html'), 'utf-8');
}

function renderMarkdownWithPython(content: string): string {
  const result = spawnSync(
    PYTHON,
    [
      '-c',
      [
        'import markdown, sys',
        'content = sys.stdin.read()',
        'print(markdown.markdown(content, extensions=["fenced_code", "codehilite"]), end="")',
      ].join('\n'),
    ],
    {
      input: content,
      encoding: 'utf8',
    },
  );

  if (result.status !== 0) {
    throw new Error(
      `Failed to render Markdown with ${PYTHON}. Run "python3 -m venv .venv && .venv/bin/pip install -r requirements.txt".\n${result.stderr}`,
    );
  }

  return result.stdout;
}

function renderMarkdown(layoutTemplate: string, buildId: string, content: string): string {
  const htmlContent = renderMarkdownWithPython(content);
  return layoutTemplate
    .replace('{page}', htmlContent)
    .replace(/{build_id}/g, buildId);
}

function renderUpdate(
  header: string,
  content: string,
  attachmentUrls: string[],
  imageClass = '',
): string {
  const imageClassAttribute = imageClass ? ` class="${imageClass}"` : '';
  let mdContent = `${header}\n\n${content}\n\n`;

  for (const url of attachmentUrls) {
    mdContent += `<a href="${url}" target="_blank"><img${imageClassAttribute} src="${url}" /></a>\n\n`;
  }

  return mdContent;
}

class Builder {
  constructor(private config: BuildConfig) {}

  async buildWebsite(): Promise<void> {
    await rm(this.config.buildDir, { recursive: true, force: true });
    await this.copyStaticFiles();
    await this.buildPages();
    await this.buildProjectPages();
    await this.buildProjectIndex();
    await this.buildBuildLog();
    console.log('Website build completed.');
  }

  private async copyStaticFiles(): Promise<void> {
    for (const staticDir of this.config.staticDirs) {
      await cp(
        join(this.config.sourceDir, staticDir),
        join(this.config.buildDir, staticDir),
        { recursive: true }
      );
    }

    const cssDir = join(this.config.buildDir, 'css');
    const files = await readdir(cssDir);
    for (const filename of files) {
      if (filename.endsWith('.css') || filename.endsWith('.js')) {
        const ext = extname(filename);
        const name = basename(filename, ext);
        const newFilename = `${name}.${this.config.buildId}${ext}`;
        await rename(
          join(cssDir, filename),
          join(cssDir, newFilename)
        );
      }
    }
  }

  private async buildPages(): Promise<void> {
    const { pages } = await db.query({
      pages: {}
    });

    for (const page of pages) {
      console.log(`Rendering page: ${page.slug}`);
      const html = this.renderMarkdown(page.content);
      await this.saveHtml(page.slug, html);
    }
  }

  private async buildProjectPages(): Promise<void> {
    const { projects } = await db.query({
      projects: {
        updates: {
          attachments: {}
        }
      }
    });

    for (const project of projects) {
      console.log(`Rendering project: ${project.slug}`);
      let mdContent = `# ${project.title}\n\n`;
      mdContent += `<img class="project-cover" src="${project.image}" />\n\n${project.description}\n`;

      const sortedUpdates = [...(project.updates || [])]
        .sort((a, b) => a.createdAt - b.createdAt);

      for (const update of sortedUpdates) {
        const attachmentUrls = (update.attachments || []).map(a => a.url);
        const date = new Date(update.createdAt).toISOString().split('T')[0];
        mdContent += renderUpdate(
          `## ${date}`,
          update.content,
          attachmentUrls,
        );
      }

      const html = this.renderMarkdown(mdContent);
      await this.saveHtml(project.slug, html, 'projects');
    }
  }

  private async buildProjectIndex(): Promise<void> {
    const { projects } = await db.query({
      projects: {}
    });

    const sortedProjects = [...projects]
      .sort((a, b) => b.createdAt - a.createdAt);

    const projectLinks = sortedProjects.map(project => {
      return `## [${project.title}](/projects/${project.slug})\n\n<a href="/projects/${project.slug}"><img class="project-cover" src="${project.image}"/></a>\n`;
    });

    const mdContent = `# Projects\n\n${projectLinks.join('')}`;
    const html = this.renderMarkdown(mdContent);
    await this.saveHtml('index', html, 'projects');
  }

  private async buildBuildLog(): Promise<void> {
    const { updates } = await db.query({
      updates: {
        project: {},
        attachments: {},
        $: { limit: 20, order: { createdAt: 'desc' } }
      }
    });

    let mdContent = '# Build log\n\n';
    for (const update of updates) {
      if (!update.project) {
        throw new Error(`Update ${update.id} is missing a project link`);
      }

      const attachmentUrls = (update.attachments || []).map(a => a.url);
      const date = new Date(update.createdAt).toISOString().split('T')[0];
      mdContent += renderUpdate(
        `## ${date} - [${update.project.title}](/projects/${update.project.slug})`,
        update.content,
        attachmentUrls,
        'attachment-thumb',
      );
    }

    const html = this.renderMarkdown(mdContent);
    await this.saveHtml('index', html, 'build-log');
  }

  private renderMarkdown(content: string): string {
    return renderMarkdown(
      this.config.layoutTemplate,
      this.config.buildId,
      content,
    );
  }

  private async saveHtml(slug: string, html: string, subdirectory = ''): Promise<void> {
    const dir = join(this.config.buildDir, subdirectory);
    await mkdir(dir, { recursive: true });
    const htmlPath = join(dir, `${slug}.html`);
    await writeFile(htmlPath, html);
  }
}

async function serveWebsite(port: number): Promise<void> {
  const server = createServer((req, res) => {
    let path = req.url || '/';

    if (path.endsWith('/')) {
      path += 'index.html';
    } else if (!path.match(/\.(html|js|css|png|jpg|jpeg|gif)$/)) {
      path += '.html';
    }

    const filePath = join(BUILD_DIR, path);

    readFile(filePath)
      .then(content => {
        const ext = extname(filePath);
        const contentType = {
          '.html': 'text/html',
          '.css': 'text/css',
          '.js': 'application/javascript',
          '.png': 'image/png',
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.gif': 'image/gif'
        }[ext] || 'text/plain';

        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
      })
      .catch(err => {
        console.error(`Error serving ${path}:`, err);
        res.writeHead(404);
        res.end('Not found');
      });
  });

  server.listen(port, () => {
    console.log(`Serving on http://localhost:${port}/ from ${BUILD_DIR}`);
  });
}

async function createBuilder(paths: BuildPaths): Promise<Builder> {
  const buildId = randomBytes(4).toString('hex');
  const layoutTemplate = await loadLayoutTemplate();
  return new Builder({ ...paths, buildId, layoutTemplate });
}

async function watchFiles(paths: BuildPaths): Promise<void> {
  console.log('Started watching for file changes...');

  let buildTimeout: NodeJS.Timeout | null = null;

  const triggerRebuild = async () => {
    if (buildTimeout) {
      clearTimeout(buildTimeout);
    }

    buildTimeout = setTimeout(async () => {
      console.log('Rebuilding website...');
      const newBuilder = await createBuilder(paths);
      await newBuilder.buildWebsite();
      console.log('Rebuild complete.');
    }, 100);
  };

  const watcher = watch([SOURCE_DIR], {
    persistent: true,
    ignoreInitial: true
  });

  watcher.on('change', triggerRebuild);
  watcher.on('add', triggerRebuild);
  watcher.on('unlink', triggerRebuild);
}

program
  .description('Build and serve the website with live reloading.')
  .option('--dev', 'Enable development mode with live reloading.')
  .option('--serve', 'Serve the website after building.')
  .option('--port <port>', 'Port to serve the website on (default: 9000).', '9000');

program.parse();

const options = program.opts();

async function main() {
  const paths = {
    buildDir: BUILD_DIR,
    sourceDir: SOURCE_DIR,
    staticDirs: STATIC_DIRS,
  };
  const builder = await createBuilder(paths);

  await builder.buildWebsite();

  if (options.dev) {
    console.log('Development mode enabled. Watching for changes...');
    watchFiles(paths);
  }

  if (options.dev || options.serve) {
    await serveWebsite(parseInt(options.port));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
