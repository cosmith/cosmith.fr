import { createContext } from "react";

export const DatabaseUpdatedContext = createContext({
  databaseUpdated: false,
  setDatabaseUpdated: (updated: boolean) => {},
});
