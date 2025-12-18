import express, { Request, Response } from 'express';
import { requireAuth } from './auth';
import { getUserById } from '../models/user';
import {
  upsertRepository,
  getRepositoriesByUser,
  getSelectedRepositories,
  setSelectedRepositories,
} from '../models/repository';
import { GitHubService } from '../services/github';

const router = express.Router();

// Fetch and sync repositories from GitHub
router.get('/sync', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = await getUserById(req.session.userId!);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const githubService = new GitHubService(user.access_token);
    const repos = await githubService.getUserRepositories();

    // Upsert repositories
    for (const repo of repos) {
      await upsertRepository(
        user.id,
        repo.id.toString(),
        repo.name,
        repo.full_name,
        repo.owner.login,
        repo.updated_at ? new Date(repo.updated_at) : undefined
      );
    }

    const syncedRepos = await getRepositoriesByUser(user.id);
    res.json({ count: syncedRepos.length, repositories: syncedRepos });
  } catch (error) {
    console.error('Error syncing repositories:', error);
    res.status(500).json({ error: 'Failed to sync repositories' });
  }
});

// Get all repositories for current user
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const repos = await getRepositoriesByUser(req.session.userId!);
    res.json({ repositories: repos });
  } catch (error) {
    console.error('Error fetching repositories:', error);
    res.status(500).json({ error: 'Failed to fetch repositories' });
  }
});

// Get selected repositories
router.get('/selected', requireAuth, async (req: Request, res: Response) => {
  try {
    const repos = await getSelectedRepositories(req.session.userId!);
    res.json({ repositories: repos });
  } catch (error) {
    console.error('Error fetching selected repositories:', error);
    res.status(500).json({ error: 'Failed to fetch selected repositories' });
  }
});

// Set selected repositories (max 3)
router.post('/select', requireAuth, async (req: Request, res: Response) => {
  try {
    const { repositoryIds } = req.body;

    if (!Array.isArray(repositoryIds)) {
      return res.status(400).json({ error: 'repositoryIds must be an array' });
    }

    if (repositoryIds.length > 3) {
      return res.status(400).json({ error: 'Maximum 3 repositories can be selected' });
    }

    await setSelectedRepositories(req.session.userId!, repositoryIds);
    const selected = await getSelectedRepositories(req.session.userId!);

    res.json({ message: 'Repositories selected successfully', repositories: selected });
  } catch (error) {
    console.error('Error selecting repositories:', error);
    res.status(500).json({ error: 'Failed to select repositories' });
  }
});

export default router;
