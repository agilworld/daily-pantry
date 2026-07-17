import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

/**
 * Create a Drizzle ORM instance connected to Turso (libsql).
 *
 * @param env - Optional env overrides for TURSO_CONNECTION_URL and TURSO_AUTH_TOKEN.
 *              Falls back to process.env values.
 * @returns Drizzle client with typed schema.
 */
export function createDb(
  env?: { TURSO_CONNECTION_URL: string; TURSO_AUTH_TOKEN: string },
) {
  const client = createClient({
    url: env?.TURSO_CONNECTION_URL ?? process.env.TURSO_CONNECTION_URL!,
    authToken: env?.TURSO_AUTH_TOKEN ?? process.env.TURSO_AUTH_TOKEN!,
    
  });
  return drizzle(client, { schema, logger: { logQuery(query, params) { console.log(query, params); } } });
}

export * from "drizzle-orm";
