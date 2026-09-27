import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

function createDb() {
  const url =
    process.env.DATABASE_URL ??
    "postgresql://roomres:roomres@localhost:5432/roomres";
  return drizzle(neon(url), { schema });
}

let database: ReturnType<typeof createDb> | null = null;

export function getDb() {
  if (!database) database = createDb();
  return database;
}
