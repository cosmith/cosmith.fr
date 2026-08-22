import { DatabaseSync } from 'node:sqlite';

export type Page = {
  slug: string;
  content: string;
};

export type Attachment = {
  url: string;
};

export type Update = {
  id: number;
  content: string;
  createdAt: string;
  attachments: Attachment[];
};

export type Project = {
  id: number;
  title: string;
  slug: string;
  image: string;
  description: string;
  updates: Update[];
};

export type RecentUpdate = Update & {
  project: Pick<Project, 'title' | 'slug'>;
};

type PageRow = {
  slug: string;
  content: string;
};

type ProjectRow = {
  id: number;
  title: string;
  slug: string;
  image: string;
  description: string;
};

type UpdateRow = {
  id: number;
  projectId: number;
  content: string;
  createdAt: string;
};

type AttachmentRow = {
  updateId: number;
  url: string;
};

type RecentUpdateRow = UpdateRow & {
  projectTitle: string;
  projectSlug: string;
};

export class ContentStore {
  private readonly database: DatabaseSync;

  constructor(databasePath: string) {
    this.database = new DatabaseSync(databasePath, { readOnly: true });
  }

  listPages(): Page[] {
    return this.database
      .prepare('SELECT slug, content FROM pages ORDER BY id')
      .all() as PageRow[];
  }

  listProjects(): Project[] {
    const projects = this.database
      .prepare(
        `SELECT id, title, slug, image, description
         FROM projects
         ORDER BY id DESC`,
      )
      .all() as ProjectRow[];

    return projects.map((project) => ({ ...project, updates: [] }));
  }

  listProjectsWithUpdates(): Project[] {
    const projects = this.listProjects();
    const updates = this.database
      .prepare(
        `SELECT id, project_id AS projectId, content, created_at AS createdAt
         FROM updates
         ORDER BY created_at ASC, id ASC`,
      )
      .all() as UpdateRow[];
    const attachments = this.listAttachments();

    const updatesByProject = new Map<number, Update[]>();
    for (const update of updates) {
      const projectUpdates = updatesByProject.get(update.projectId) ?? [];
      projectUpdates.push({
        id: update.id,
        content: update.content,
        createdAt: update.createdAt,
        attachments: attachments.get(update.id) ?? [],
      });
      updatesByProject.set(update.projectId, projectUpdates);
    }

    return projects.map((project) => ({
      ...project,
      updates: updatesByProject.get(project.id) ?? [],
    }));
  }

  listRecentUpdates(limit: number): RecentUpdate[] {
    if (!Number.isSafeInteger(limit) || limit < 0) {
      throw new Error(`Update limit must be a non-negative integer, received ${limit}`);
    }

    const updates = this.database
      .prepare(
        `SELECT
           updates.id,
           updates.project_id AS projectId,
           updates.content,
           updates.created_at AS createdAt,
           projects.title AS projectTitle,
           projects.slug AS projectSlug
         FROM updates
         JOIN projects ON projects.id = updates.project_id
         ORDER BY updates.created_at DESC, updates.id DESC
         LIMIT ?`,
      )
      .all(limit) as RecentUpdateRow[];
    const attachments = this.listAttachments();

    return updates.map((update) => ({
      id: update.id,
      content: update.content,
      createdAt: update.createdAt,
      attachments: attachments.get(update.id) ?? [],
      project: {
        title: update.projectTitle,
        slug: update.projectSlug,
      },
    }));
  }

  private listAttachments(): Map<number, Attachment[]> {
    const rows = this.database
      .prepare(
        `SELECT update_id AS updateId, url
         FROM attachments
         ORDER BY id ASC`,
      )
      .all() as AttachmentRow[];
    const attachments = new Map<number, Attachment[]>();

    for (const row of rows) {
      const updateAttachments = attachments.get(row.updateId) ?? [];
      updateAttachments.push({ url: row.url });
      attachments.set(row.updateId, updateAttachments);
    }

    return attachments;
  }
}
