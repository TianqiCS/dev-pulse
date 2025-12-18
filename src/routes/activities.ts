import express, { Request, Response } from 'express';
import { requireAuth } from './auth';
import { getActivitiesByRepo, getActivitiesByRepoAndDateRange } from '../models/activity';

const router = express.Router();

// Get activities for a repository
router.get('/:repoId', requireAuth, async (req: Request, res: Response) => {
  try {
    const repoId = parseInt(req.params.repoId, 10);
    const { startDate, endDate, limit } = req.query;

    let activities;

    if (startDate && endDate) {
      activities = await getActivitiesByRepoAndDateRange(
        repoId,
        new Date(startDate as string),
        new Date(endDate as string)
      );
    } else {
      const activityLimit = limit ? parseInt(limit as string, 10) : 100;
      activities = await getActivitiesByRepo(repoId, activityLimit);
    }

    res.json({ activities });
  } catch (error) {
    console.error('Error fetching activities:', error);
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
});

export default router;
