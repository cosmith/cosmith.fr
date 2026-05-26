import { id } from '@instantdb/admin';
import { execFileSync } from 'node:child_process';
import db from '../src/admin-db.js';

type SqlPage = {
  id: number;
  slug: string;
  content: string;
};

type SqlProject = {
  id: number;
  title: string;
  slug: string;
  image: string;
  description: string;
};

type SqlUpdate = {
  id: number;
  project_id: number;
  created_at: string;
  content: string;
};

type SqlAttachment = {
  id: number;
  update_id: number;
  url: string;
};

function getArg(name: string): string | undefined {
  const prefix = `${name}=`;
  const value = process.argv.find((arg) => arg.startsWith(prefix));
  return value ? value.slice(prefix.length) : undefined;
}

function sql<T>(dbPath: string, query: string): T[] {
  const output = execFileSync('sqlite3', ['-json', dbPath, query], {
    encoding: 'utf8',
  });
  return output.trim() ? JSON.parse(output) : [];
}

function pageTitle(slug: string): string {
  if (slug === 'index') return 'Home';
  return slug.slice(0, 1).toUpperCase() + slug.slice(1);
}

function dateToTimestamp(date: string, legacyId = 0): number {
  const timestamp = new Date(`${date}T00:00:00.000Z`).getTime();
  if (Number.isNaN(timestamp)) {
    throw new Error(`Invalid date: ${date}`);
  }

  return timestamp + legacyId;
}

async function main() {
  const sqlitePath = getArg('--sqlite');
  if (!sqlitePath) {
    throw new Error('Usage: bun run scripts/import-sqlite-to-instant.ts --sqlite=/path/to/db.sqlite3');
  }

  const pages = sql<SqlPage>(sqlitePath, 'select id, slug, content from pages order by id');
  const projects = sql<SqlProject>(
    sqlitePath,
    'select id, title, slug, image, description from projects order by id',
  );
  const updates = sql<SqlUpdate>(
    sqlitePath,
    'select id, project_id, created_at, content from updates order by id',
  );
  const attachments = sql<SqlAttachment>(
    sqlitePath,
    'select id, update_id, url from attachments order by id',
  );

  const projectIds = new Map<number, string>();
  const updateIds = new Map<number, string>();
  const steps = [];

  for (const page of pages) {
    steps.push(
      db.tx.pages[id()].update({
        slug: page.slug,
        title: pageTitle(page.slug),
        content: page.content,
      }),
    );
  }

  for (const project of projects) {
    const entityId = id();
    projectIds.set(project.id, entityId);
    steps.push(
      db.tx.projects[entityId].update({
        title: project.title,
        slug: project.slug,
        image: project.image,
        description: project.description,
        createdAt: project.id,
      }),
    );
  }

  for (const update of updates) {
    const entityId = id();
    const projectId = projectIds.get(update.project_id);
    if (!projectId) {
      throw new Error(`Project ${update.project_id} not found for update ${update.id}`);
    }

    updateIds.set(update.id, entityId);
    steps.push(
      db.tx.updates[entityId].update({
        content: update.content,
        createdAt: dateToTimestamp(update.created_at, update.id),
      }),
      db.tx.updates[entityId].link({ project: projectId }),
    );
  }

  for (const attachment of attachments) {
    const entityId = id();
    const updateId = updateIds.get(attachment.update_id);
    if (!updateId) {
      throw new Error(`Update ${attachment.update_id} not found for attachment ${attachment.id}`);
    }

    steps.push(
      db.tx.attachments[entityId].update({
        url: attachment.url,
        filename: attachment.url.split('/').pop() || attachment.url,
      }),
      db.tx.attachments[entityId].link({ update: updateId }),
    );
  }

  const existing = await db.query({
    attachments: {},
    updates: {},
    projects: {},
    pages: {},
  });

  const deleteSteps = [
    ...existing.attachments.map((item) => db.tx.attachments[item.id].delete()),
    ...existing.updates.map((item) => db.tx.updates[item.id].delete()),
    ...existing.projects.map((item) => db.tx.projects[item.id].delete()),
    ...existing.pages.map((item) => db.tx.pages[item.id].delete()),
  ];

  const transactionSteps = [...deleteSteps, ...steps];
  if (transactionSteps.length > 0) {
    await db.transact(transactionSteps);
  }

  console.log(
    `Imported ${pages.length} pages, ${projects.length} projects, ${updates.length} updates, and ${attachments.length} attachments.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
