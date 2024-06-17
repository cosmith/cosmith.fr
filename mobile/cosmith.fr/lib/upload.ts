import { uploadFile } from "./objectStoreSetup";
import { DATABASE_URI } from "./databaseSetup";

export async function uploadDatabase() {
  await uploadFile(DATABASE_URI, "data.db", "application/x-sqlite3");
}
