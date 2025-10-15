import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to check if user is authenticated
 * Requires a valid session with user information
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.user) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'Please log in to access this resource',
    });
  }

  next();
}

/**
 * Middleware to optionally check authentication
 * Continues even if not authenticated, but sets req.userId if available
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  // User ID will be available in req.session.user.id if authenticated
  next();
}

/**
 * Helper to get user ID from request
 * Checks both session (for session-based auth) and custom header (for localStorage-based GitHub auth)
 * Returns null if not authenticated
 */
export function getUserId(req: Request): number | null {
  // First check session-based auth
  if (req.session?.user?.id) {
    return req.session.user.id;
  }

  // Then check for GitHub user ID from custom header (localStorage-based auth)
  const githubUserId = req.headers['x-github-user-id'];
  if (githubUserId && typeof githubUserId === 'string') {
    const userId = parseInt(githubUserId, 10);
    if (!isNaN(userId)) {
      return userId;
    }
  }

  return null;
}

/**
 * Helper to check if document belongs to user or is public
 */
export function canAccessDocument(doc: any, userId: number | null): boolean {
  if (!doc) return false;
  if (doc.isPublic) return true;
  if (userId && doc.userId === userId) return true;
  return false;
}
