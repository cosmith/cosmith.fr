import { getDatabase } from "./databaseSetup";

export async function getProjects() {
  const db = await getDatabase();
  const results = await db.getAllAsync("SELECT * FROM projects", []);
  return results;
}

export async function getProject(id: string) {
  const db = await getDatabase();
  const results = await db.getAllAsync("SELECT * FROM projects WHERE id = ?", [
    id,
  ]);
  return results[0];
}

export async function getUpdates(projectId: string) {
  const db = await getDatabase();
  const results = await db.getAllAsync(
    "SELECT * FROM updates WHERE project_id = ?",
    [projectId]
  );
  return results;
}

export async function getUpdate(updateId: string) {
  const db = await getDatabase();
  const results = await db.getAllAsync("SELECT * FROM updates WHERE id = ?", [
    updateId,
  ]);
  return results[0];
}

export async function updateUpdate(updateId: string, content: string) {
  const db = await getDatabase();
  const results = await db.runAsync(
    "UPDATE updates SET content = ? WHERE id = ?",
    [content, updateId]
  );
  return results;
}

export async function createUpdate(projectId: string, content: string) {
  const db = await getDatabase();
  const createdAt = new Date().toISOString().split("T")[0];
  const results = await db.runAsync(
    "INSERT INTO updates (project_id, created_at, content) VALUES (?, ?, ?)",
    [projectId, createdAt, content]
  );
  return results;
}
