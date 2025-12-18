import express, { Request, Response, NextFunction } from 'express';
import { Octokit } from '@octokit/rest';
import { config } from '../config';
import { findOrCreateUser } from '../models/user';

const router = express.Router();

// Middleware to check if user is authenticated
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// Start GitHub OAuth flow
router.get('/github', (req: Request, res: Response) => {
  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${config.github.clientId}&scope=repo,read:user`;
  res.redirect(githubAuthUrl);
});

// GitHub OAuth callback
router.get('/github/callback', async (req: Request, res: Response) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({ error: 'No code provided' });
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: config.github.clientId,
        client_secret: config.github.clientSecret,
        code,
      }),
    });

    const tokenData = await tokenResponse.json() as {
      access_token?: string;
      error?: string;
      error_description?: string;
    };

    if (tokenData.error) {
      return res.status(400).json({ error: tokenData.error_description });
    }

    const accessToken = tokenData.access_token;

    if (!accessToken) {
      return res.status(400).json({ error: 'No access token received' });
    }

    // Get user info from GitHub
    const octokit = new Octokit({ auth: accessToken });
    const { data: githubUser } = await octokit.users.getAuthenticated();

    // Create or update user in database
    const user = await findOrCreateUser(
      githubUser.id.toString(),
      githubUser.login,
      accessToken
    );

    // Set session
    req.session.userId = user.id;
    req.session.githubUsername = user.username;

    // Redirect back to frontend
    res.redirect('/');
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Logout
router.post('/logout', (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.json({ message: 'Logged out successfully' });
  });
});

// Get current user
router.get('/me', requireAuth, (req: Request, res: Response) => {
  res.json({
    userId: req.session.userId,
    username: req.session.githubUsername,
  });
});

export default router;
