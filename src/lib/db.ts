import { Pool, type PoolClient } from "@neondatabase/serverless";

export class DatabaseConfigError extends Error {
  constructor(
    message = "DATABASE_URL não configurada. Conecte o banco Neon PostgreSQL na Vercel ou no arquivo .env.local."
  ) {
    super(message);
    this.name = "DatabaseConfigError";
  }
}

declare global {
  var __leoNeonPool: Pool | undefined;
}

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length > 0);
}

export function getPool(): Pool {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    throw new DatabaseConfigError();
  }

  if (!globalThis.__leoNeonPool) {
    globalThis.__leoNeonPool = new Pool({
      connectionString,
      max: 5,
      idleTimeoutMillis: 15000,
      connectionTimeoutMillis: 10000,
    });
  }

  return globalThis.__leoNeonPool;
}

export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // ignore rollback errors
    }
    throw err;
  } finally {
    client.release();
  }
}
