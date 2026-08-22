The website is a static TypeScript build backed by the checked-in `data/content.sqlite3` database. Keep SQLite access inside `src/content-store.ts` so rendering code stays independent of storage details.

Before generating a new Next.js app, check whether a Next.js project already exists in the current directory. If it does, do not generate another one.
