import express, { Request, Response } from 'express';
import { exchangeCodeForToken, getGitHubUser, getUserRepositories } from '../services/authService';
import { tokenStorage } from '../services/tokenStorage';

const router = express.Router();

/**
 * GET /api/auth/github
 * Redirect to GitHub OAuth authorization page
 */
router.get('/github', (req: Request, res: Response) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  if (!clientId) {
    return res.status(500).json({ error: 'GitHub OAuth not configured' });
  }

  // Use x-forwarded-proto header if available (for proxies like Cloud Run)
  const protocol = req.get('x-forwarded-proto') || req.protocol;
  const redirectUri = `${protocol}://${req.get('host')}/api/auth/github/callback`;
  const scope = 'user:email repo';

  // Add prompt=select_account to force GitHub to show account selection
  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&scope=${encodeURIComponent(scope)}&prompt=select_account`;

  res.redirect(githubAuthUrl);
});

/**
 * GET /api/auth/github/callback
 * Handle GitHub OAuth callback
 */
router.get('/github/callback', async (req: Request, res: Response) => {
  const { code, error } = req.query;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  if (error) {
    console.error('GitHub OAuth error:', error);
    return res.redirect(`${frontendUrl}/app/github?error=${error}`);
  }

  if (!code || typeof code !== 'string') {
    return res.redirect(`${frontendUrl}/app/github?error=no_code`);
  }

  try {
    // Exchange code for access token
    const accessToken = await exchangeCodeForToken(code);

    // Get user information
    const user = await getGitHubUser(accessToken);

    // Store OAuth token for webhook use
    tokenStorage.store(user.id, accessToken, user.login);

    // Store user session (still useful for backend tracking)
    if (req.session) {
      req.session.user = {
        id: user.id,
        login: user.login,
        name: user.name,
        email: user.email,
        avatar_url: user.avatar_url,
        html_url: user.html_url,
      };
      req.session.accessToken = accessToken;
    }

    // Encode user data and token to pass to frontend
    const userData = encodeURIComponent(JSON.stringify({
      id: user.id,
      login: user.login,
      name: user.name,
      email: user.email,
      avatar_url: user.avatar_url,
      html_url: user.html_url,
    }));
    const encodedToken = encodeURIComponent(accessToken);

    // Redirect to frontend with success and user data
    res.redirect(`${frontendUrl}/app/github?auth=success&user=${userData}&token=${encodedToken}`);
  } catch (error: any) {
    console.error('Error during GitHub OAuth callback:', error);
    res.redirect(`${frontendUrl}/app/github?error=auth_failed`);
  }
});

/**
 * GET /api/auth/user
 * Get current authenticated user
 */
router.get('/user', (req: Request, res: Response) => {
  if (!req.session?.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  res.json({
    user: req.session.user,
    authenticated: true,
  });
});

/**
 * GET /api/auth/repositories
 * Get user's GitHub repositories
 */
router.get('/repositories', async (req: Request, res: Response) => {
  if (!req.session?.accessToken) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const page = parseInt(req.query.page as string) || 1;
    const perPage = parseInt(req.query.per_page as string) || 30;

    const repositories = await getUserRepositories(
      req.session.accessToken,
      page,
      perPage
    );

    res.json({
      repositories,
      page,
      perPage,
    });
  } catch (error: any) {
    console.error('Error fetching repositories:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/auth/logout
 * Logout user and destroy session
 */
router.post('/logout', (req: Request, res: Response) => {
  // Remove stored OAuth token
  if (req.session?.user?.id) {
    tokenStorage.remove(req.session.user.id);
  }

  if (req.session) {
    req.session.destroy((err) => {
      if (err) {
        console.error('Error destroying session:', err);
        return res.status(500).json({ error: 'Failed to logout' });
      }

      res.clearCookie('connect.sid');
      res.json({ message: 'Logged out successfully' });
    });
  } else {
    res.json({ message: 'No active session' });
  }
});

export default router;
