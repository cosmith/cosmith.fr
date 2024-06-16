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
