import { query } from '../db';

export interface User {
  id: number;
  github_id: string;
  username: string;
  access_token: string;
  created_at: Date;
  updated_at: Date;
}

export async function findOrCreateUser(
  githubId: string,
  username: string,
  accessToken: string
): Promise<User> {
  const existingUser = await query(
    'SELECT * FROM users WHERE github_id = $1',
    [githubId]
  );

  if (existingUser.rows.length > 0) {
    // Update access token
    const updated = await query(
      'UPDATE users SET access_token = $1, updated_at = NOW() WHERE github_id = $2 RETURNING *',
      [accessToken, githubId]
    );
    return updated.rows[0];
  }

  const newUser = await query(
    'INSERT INTO users (github_id, username, access_token) VALUES ($1, $2, $3) RETURNING *',
    [githubId, username, accessToken]
  );

  return newUser.rows[0];
}

export async function getUserById(id: number): Promise<User | null> {
  const result = await query('SELECT * FROM users WHERE id = $1', [id]);
  return result.rows[0] || null;
}

export async function getUserByGithubId(githubId: string): Promise<User | null> {
  const result = await query('SELECT * FROM users WHERE github_id = $1', [githubId]);
  return result.rows[0] || null;
}
