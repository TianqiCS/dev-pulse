import express, { Request, Response } from 'express';
import { requireAuth } from './auth';
import { getSelectedRepositories, getRepositoryById } from '../models/repository';
import { getAllSummariesForRepo, getLatestSummary, softDeleteSummary } from '../models/summary';
import { query } from '../db';

const router = express.Router();

// Get all summaries for a repository
router.get('/repo/:repoId', requireAuth, async (req: Request, res: Response) => {
  try {
    const repoId = parseInt(req.params.repoId, 10);

    // Verify repo belongs to user
    const repo = await getRepositoryById(repoId);
    if (!repo || repo.user_id !== req.session.userId) {
      return res.status(404).json({ error: 'Repository not found' });
    }

    const summaries = await getAllSummariesForRepo(repoId);
    res.json({ repository: repo.full_name, summaries });
  } catch (error) {
    console.error('Error fetching summaries:', error);
    res.status(500).json({ error: 'Failed to fetch summaries' });
  }
});

// Get latest summary for a repository
router.get('/repo/:repoId/latest', requireAuth, async (req: Request, res: Response) => {
  try {
    const repoId = parseInt(req.params.repoId, 10);

    // Verify repo belongs to user
    const repo = await getRepositoryById(repoId);
    if (!repo || repo.user_id !== req.session.userId) {
      return res.status(404).json({ error: 'Repository not found' });
    }

    const summary = await getLatestSummary(repoId);
    if (!summary) {
      return res.status(404).json({ error: 'No summaries found for this repository' });
    }

    res.json({ repository: repo.full_name, summary });
  } catch (error) {
    console.error('Error fetching latest summary:', error);
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

// Get all latest summaries for selected repos
router.get('/latest', requireAuth, async (req: Request, res: Response) => {
  try {
    const repos = await getSelectedRepositories(req.session.userId!);

    const summaries = await Promise.all(
      repos.map(async (repo) => {
        const summary = await getLatestSummary(repo.id);
        return {
          repository: repo.full_name,
          repoId: repo.id,
          summary,
        };
      })
    );

    res.json({ summaries });
  } catch (error) {
    console.error('Error fetching summaries:', error);
    res.status(500).json({ error: 'Failed to fetch summaries' });
  }
});

// Generate new summary for a repository
router.post('/repo/:repoId/generate', requireAuth, async (req: Request, res: Response) => {
  try {
    const repoId = parseInt(req.params.repoId, 10);

    // Verify repo belongs to user
    const repo = await getRepositoryById(repoId);
    if (!repo || repo.user_id !== req.session.userId) {
      return res.status(404).json({ error: 'Repository not found' });
    }

    // Get user for access token
    const { getUserById } = await import('../models/user');
    const user = await getUserById(req.session.userId!);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Start generation asynchronously
    res.json({ 
      message: 'Summary generation started. Fetching latest activity...',
      repository: repo.full_name 
    });

    // Import services dynamically to avoid circular dependencies
    const { GitHubService } = await import('../services/github');
    const { aggregateWeeklyActivity } = await import('../services/aggregation');
    const { SummaryService } = await import('../services/summary');
    const { createOrUpdateSummary } = await import('../models/summary');

    (async () => {
      try {
        console.log(`Starting summary generation for ${repo.full_name}...`);
        
        // Step 1: Ingest latest activity from GitHub
        console.log(`  1/3 Fetching latest activity from GitHub...`);
        const githubService = new GitHubService(user.access_token);
        try {
          await githubService.ingestRepositoryActivity(repo, 7);
          console.log(`  ✓ Activity ingestion complete`);
        } catch (error: any) {
          if (error.status === 403 && error.message?.includes('organization has enabled OAuth App access restrictions')) {
            console.warn(`  ⚠️  Skipped ingestion: OAuth restrictions`);
          } else {
            throw error;
          }
        }
        
        // Step 2: Aggregate activity data
        console.log(`  2/3 Aggregating activity data...`);
        const activityData = await aggregateWeeklyActivity(repo);
        console.log(`  ✓ Found ${activityData.stats.commits} commits, ${activityData.stats.prsOpened} PRs`);
        
        // Step 3: Generate AI summary
        console.log(`  3/3 Generating AI summary...`);
        const summaryService = new SummaryService();
        const summaryText = await summaryService.generateWeeklySummary(activityData);
        
        // Store in database
        await createOrUpdateSummary(
          repo.id,
          activityData.weekStart,
          activityData.weekEnd,
          summaryText,
          'gpt-5-mini-2025-08-07'
        );
        
        console.log(`✓ Summary generation complete for ${repo.full_name}`);
      } catch (error) {
        console.error(`✗ Failed to generate summary for ${repo.full_name}:`, error);
      }
    })();
  } catch (error) {
    console.error('Error generating summary:', error);
    res.status(500).json({ error: 'Failed to generate summary' });
  }
});

// Delete a summary (soft delete)
router.delete('/:summaryId', requireAuth, async (req: Request, res: Response) => {
  try {
    const summaryId = parseInt(req.params.summaryId, 10);

    // Verify summary exists and belongs to user's repo
    const result = await query(
      `SELECT s.*, r.user_id 
       FROM summaries s
       JOIN repositories r ON s.repo_id = r.id
       WHERE s.id = $1`,
      [summaryId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Summary not found' });
    }

    if (result.rows[0].user_id !== req.session.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await softDeleteSummary(summaryId);
    res.json({ message: 'Summary deleted successfully' });
  } catch (error) {
    console.error('Error deleting summary:', error);
    res.status(500).json({ error: 'Failed to delete summary' });
  }
});

export default router;
