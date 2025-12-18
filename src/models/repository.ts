import { query } from '../db';

export interface Repository {
  id: number;
  user_id: number;
  github_id: string;
  name: string;
  full_name: string;
  owner: string;
  is_selected: boolean;
  created_at: Date;
  updated_at: Date;
}

export async function upsertRepository(
  userId: number,
  githubId: string,
  name: string,
  fullName: string,
  owner: string
): Promise<Repository> {
  const result = await query(
    `INSERT INTO repositories (user_id, github_id, name, full_name, owner)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id, github_id) 
     DO UPDATE SET name = $3, full_name = $4, owner = $5, updated_at = NOW()
     RETURNING *`,
    [userId, githubId, name, fullName, owner]
  );
  return result.rows[0];
}

export async function getRepositoriesByUser(userId: number): Promise<Repository[]> {
  const result = await query(
    'SELECT * FROM repositories WHERE user_id = $1 ORDER BY name',
    [userId]
  );
  return result.rows;
}

export async function getSelectedRepositories(userId: number): Promise<Repository[]> {
  const result = await query(
    'SELECT * FROM repositories WHERE user_id = $1 AND is_selected = true',
    [userId]
  );
  return result.rows;
}

export async function setSelectedRepositories(
  userId: number,
  repoIds: number[]
): Promise<void> {
  const client = await query('BEGIN', []);

  try {
    // Unselect all repos for this user
    await query('UPDATE repositories SET is_selected = false WHERE user_id = $1', [userId]);

    // Select the specified repos (limit to 3)
    const limitedRepoIds = repoIds.slice(0, 3);
    if (limitedRepoIds.length > 0) {
      await query(
        'UPDATE repositories SET is_selected = true WHERE user_id = $1 AND id = ANY($2)',
        [userId, limitedRepoIds]
      );
    }

    await query('COMMIT', []);
  } catch (error) {
    await query('ROLLBACK', []);
    throw error;
  }
}

export async function getRepositoryById(id: number): Promise<Repository | null> {
  const result = await query('SELECT * FROM repositories WHERE id = $1', [id]);
  return result.rows[0] || null;
}
