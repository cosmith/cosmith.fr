PRAGMA foreign_keys = ON;

CREATE TABLE pages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL
);

CREATE TABLE projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  image TEXT NOT NULL,
  description TEXT NOT NULL
);

CREATE TABLE updates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  content TEXT NOT NULL
);

CREATE INDEX updates_project_id ON updates(project_id);
CREATE INDEX updates_created_at ON updates(created_at DESC, id DESC);

CREATE TABLE attachments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  update_id INTEGER NOT NULL REFERENCES updates(id) ON DELETE CASCADE,
  url TEXT NOT NULL
);

CREATE INDEX attachments_update_id ON attachments(update_id);
