import { query } from '../db';

export type EventType =
  | 'commit'
  | 'pr_opened'
  | 'pr_merged'
  | 'pr_closed'
  | 'pr_review'
  | 'pr_comment'
  | 'ci_success'
  | 'ci_failure'
  | 'issue_opened'
  | 'issue_closed'
  | 'issue_comment';

export interface Activity {
  id: number;
  repo_id: number;
  event_type: EventType;
  github_id: string | null;
  author: string;
  timestamp: Date;
  raw_payload: any;
  created_at: Date;
}

export async function createActivity(
  repoId: number,
  eventType: EventType,
  githubId: string | null,
  author: string,
  timestamp: Date,
  rawPayload: any
): Promise<Activity | null> {
  try {
    const result = await query(
      `INSERT INTO activities (repo_id, event_type, github_id, author, timestamp, raw_payload)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (repo_id, event_type, github_id) 
       DO UPDATE SET
         author = EXCLUDED.author,
         timestamp = EXCLUDED.timestamp,
         raw_payload = EXCLUDED.raw_payload
       RETURNING *`,
      [repoId, eventType, githubId, author, timestamp, JSON.stringify(rawPayload)]
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error creating activity:', error);
    return null;
  }
}

export async function getActivitiesByRepo(
  repoId: number,
  limit: number = 100
): Promise<Activity[]> {
  const result = await query(
    'SELECT * FROM activities WHERE repo_id = $1 ORDER BY timestamp DESC LIMIT $2',
    [repoId, limit]
  );
  return result.rows;
}

export async function getActivitiesByRepoAndDateRange(
  repoId: number,
  startDate: Date,
  endDate: Date
): Promise<Activity[]> {
  const result = await query(
    'SELECT * FROM activities WHERE repo_id = $1 AND timestamp >= $2 AND timestamp <= $3 ORDER BY timestamp DESC',
    [repoId, startDate, endDate]
  );
  return result.rows;
}
