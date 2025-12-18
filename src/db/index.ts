import { Pool, PoolClient } from 'pg';
import { config } from '../config';

export const pool = new Pool({
  connectionString: config.databaseUrl,
});

export async function query(text: string, params?: any[]) {
  const start = Date.now();
  const res = params ? await pool.query(text, params) : await pool.query(text);
  const duration = Date.now() - start;
  console.log('Executed query', { text: text.substring(0, 50) + '...', duration, rows: res.rowCount });
  return res;
}

export async function getClient(): Promise<PoolClient> {
  const client = await pool.connect();
  return client;
}
