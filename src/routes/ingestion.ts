import express, { Request, Response } from 'express';
import { requireAuth } from './auth';
import { getSelectedRepositories } from '../models/repository';
import { getUserById } from '../models/user';
import { GitHubService } from '../services/github';

const router = express.Router();

// Trigger ingestion job for current user
router.post('/trigger', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = await getUserById(req.session.userId!);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const selectedRepos = await getSelectedRepositories(user.id);
    if (selectedRepos.length === 0) {
      return res.status(400).json({ error: 'No repositories selected' });
    }

    res.json({
      message: 'Ingestion started',
      repositories: selectedRepos.map((r) => r.full_name),
    });

    // Run ingestion asynchronously
    const githubService = new GitHubService(user.access_token);
    
    (async () => {
      let successCount = 0;
      let skippedCount = 0;
      
      for (const repo of selectedRepos) {
        try {
          await githubService.ingestRepositoryActivity(repo, 7);
          successCount++;
        } catch (error: any) {
          if (error.status === 403 && error.message?.includes('organization has enabled OAuth App access restrictions')) {
            skippedCount++;
          } else {
            console.error(`Failed to ingest ${repo.full_name}:`, error);
          }
        }
      }
      console.log(`Background ingestion completed: ${successCount} successful, ${skippedCount} skipped`);
    })();
  } catch (error) {
    console.error('Error triggering ingestion:', error);
    res.status(500).json({ error: 'Failed to trigger ingestion' });
  }
});

export default router;
