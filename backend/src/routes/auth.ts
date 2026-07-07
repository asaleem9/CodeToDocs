import express, { Request, Response } from 'express';
import crypto from 'crypto';
import { exchangeCodeForToken, getGitHubUser, getUserRepositories } from '../services/authService';
import { tokenStorage } from '../services/tokenStorage';
import { signToken, signAnonToken, verifyAnonToken } from '../utils/appToken';
import { getAuthUser, getUserId } from '../middleware/auth';
import { rateLimit } from '../middleware/rateLimit';

const router = express.Router();

// Covers the OAuth redirect dance along with everything else on this router -
// 60 requests per 15 minutes is generous for normal login/logout traffic.
router.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 60, keyPrefix: 'auth' }));

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

    // Store OAuth token for webhook use (now with full user info)
    await tokenStorage.store(user.id, accessToken, user.login, {
      githubEmail: user.email,
      avatarUrl: user.avatar_url,
      name: user.name,
    });

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

    const profile = {
      id: user.id,
      login: user.login,
      name: user.name,
      email: user.email,
      avatar_url: user.avatar_url,
      html_url: user.html_url,
    };

    // Encode the public user profile to pass to the frontend for display.
    const userData = encodeURIComponent(JSON.stringify(profile));

    // Issue a signed app token so the client can authenticate cross-origin
    // (the GitHub access token stays server-side). It goes in the URL fragment,
    // which browsers do not send to servers or include in the Referer header.
    const appToken = signToken(profile);

    res.redirect(
      `${frontendUrl}/app/github?auth=success&user=${userData}#token=${encodeURIComponent(appToken)}`
    );
  } catch (error: any) {
    console.error('Error during GitHub OAuth callback:', error);
    res.redirect(`${frontendUrl}/app/github?error=auth_failed`);
  }
});

/**
 * POST /api/auth/anon
 * Mint or renew a signed anonymous identity token. This is what keeps an
 * anonymous user's document history intact across requests on Safari/Firefox,
 * which drop the session cookie between the frontend and backend's separate
 * *.run.app origins. No auth required, and no cookie is set here - the token
 * travels in the Authorization header instead.
 *
 * If the caller already presents a valid anon bearer, the same anonId is
 * re-signed with a fresh expiry (rolling renewal) so active anonymous users
 * never lose their history. Otherwise a fresh negative id is minted.
 */
router.post('/anon', (req: Request, res: Response) => {
  const header = req.headers['authorization'];
  let anonId: number | null = null;

  if (header && header.startsWith('Bearer ')) {
    anonId = verifyAnonToken(header.slice('Bearer '.length));
  }

  if (anonId === null) {
    // 1..2^31-1, negated. crypto.randomInt is unbiased.
    anonId = -crypto.randomInt(1, 2_147_483_647);
  }

  res.json({ token: signAnonToken(anonId), anonId });
});

/**
 * GET /api/auth/user
 * Get current authenticated user
 */
router.get('/user', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  res.json({
    user,
    authenticated: true,
  });
});

/**
 * GET /api/auth/repositories
 * Get user's GitHub repositories
 */
router.get('/repositories', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  // Resolve the GitHub access token from server-side storage (works whether the
  // caller authenticated via the app token or a session).
  const accessToken = req.session?.accessToken || (await tokenStorage.get(userId));
  if (!accessToken) {
    return res.status(401).json({ error: 'GitHub authorization not found. Please log in again.' });
  }

  try {
    const page = parseInt(req.query.page as string) || 1;
    const perPage = parseInt(req.query.per_page as string) || 30;

    const repositories = await getUserRepositories(
      accessToken,
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
router.post('/logout', async (req: Request, res: Response) => {
  // Remove stored OAuth token for whoever is making the request (token or session).
  const userId = getUserId(req);
  if (userId) {
    await tokenStorage.remove(userId);
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
