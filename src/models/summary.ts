import { query } from '../db';

export interface Summary {
  id: number;
  repo_id: number;
  week_start: Date;
  week_end: Date;
  summary_text: string;
  model_version: string;
  created_at: Date;
  updated_at: Date;
}

export async function createOrUpdateSummary(
  repoId: number,
  weekStart: Date,
  weekEnd: Date,
  summaryText: string,
  modelVersion: string
): Promise<Summary> {
  const result = await query(
    `INSERT INTO summaries (repo_id, week_start, week_end, summary_text, model_version)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (repo_id, week_start, week_end)
     DO UPDATE SET 
       summary_text = $4,
       model_version = $5,
       updated_at = NOW()
     RETURNING *`,
    [repoId, weekStart, weekEnd, summaryText, modelVersion]
  );
  return result.rows[0];
}

export async function getSummary(
  repoId: number,
  weekStart: Date,
  weekEnd: Date
): Promise<Summary | null> {
  const result = await query(
    'SELECT * FROM summaries WHERE repo_id = $1 AND week_start = $2 AND week_end = $3',
    [repoId, weekStart, weekEnd]
  );
  return result.rows[0] || null;
}

export async function getLatestSummary(repoId: number): Promise<Summary | null> {
  const result = await query(
    'SELECT * FROM summaries WHERE repo_id = $1 ORDER BY week_start DESC LIMIT 1',
    [repoId]
  );
  return result.rows[0] || null;
}

export async function getAllSummariesForRepo(repoId: number): Promise<Summary[]> {
  const result = await query(
    'SELECT * FROM summaries WHERE repo_id = $1 ORDER BY week_start DESC',
    [repoId]
  );
  return result.rows;
}
