import { Pool, PoolClient, QueryResultRow } from "pg";
import config, { DATABASE_URL } from "../config";
import logger from "../logger";

const pool = new Pool({
  connectionString: DATABASE_URL,
  max: config.database.maxConnections,
  idleTimeoutMillis: config.database.idleTimeoutMs,
  connectionTimeoutMillis: config.database.connectionTimeoutMs
});

export async function query<T extends QueryResultRow = any>(text: string, params?: any[]) {
  return pool.query<T>(text, params);
}

export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const res = await fn(client);
    await client.query("COMMIT");
    return res;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function testConnection() {
  try {
    const res = await pool.query("SELECT NOW() as now");
    logger.info(`Database connected: ${res.rows[0].now}`);
  } catch (err) {
    logger.error(`Database connection failed: ${(err as Error).message}`);
    throw err;
  }
}

export default pool;
