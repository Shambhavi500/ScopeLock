import "server-only";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { env } from "@/lib/env";
import * as schema from "./schema";

export type Db = BetterSQLite3Database<typeof schema>;

// Next.js can load this module more than once (instrumentation vs route bundles), so the
// connection lives on globalThis.
const g = globalThis as unknown as { __scopelockDb?: { sqlite: Database.Database; db: Db } };

function open() {
  const file = path.resolve(env.DATABASE_PATH);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const sqlite = new Database(file);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  return { sqlite, db };
}

export function getDb(): Db {
  g.__scopelockDb ??= open();
  return g.__scopelockDb.db;
}

/** Drop every row by recreating the file. Used by boot and "Reset demo". */
export function wipeDb(): Db {
  if (g.__scopelockDb) {
    g.__scopelockDb.sqlite.close();
    g.__scopelockDb = undefined;
  }
  const file = path.resolve(env.DATABASE_PATH);
  for (const f of [file, `${file}-wal`, `${file}-shm`]) fs.rmSync(f, { force: true });
  return getDb();
}

export { schema };
