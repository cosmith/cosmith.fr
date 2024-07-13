import { uploadFile } from "./objectStoreSetup";
import { DATABASE_URI } from "./databaseSetup";

export async function uploadDatabase() {
  await uploadFile(DATABASE_URI, "data.db", "application/x-sqlite3");
}

export async function triggerWebsiteUpdate() {
  const token = process.env.EXPO_PUBLIC_GITHUB_TOKEN;
  const owner = "cosmith";
  const repo = "cosmith.fr";
  const workflow_id = "download-new-db.yml";

  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflow_id}/dispatches`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ref: "main",
          inputs: {},
        }),
      }
    );

    if (!response.ok) {
      throw new Error(
        `HTTP error! status: ${
          response.status
        }, response text: ${await response.text()}`
      );
    }

    console.log("Workflow triggered successfully");
  } catch (error) {
    console.error("Error triggering workflow:", error);
    throw error;
  }
}
