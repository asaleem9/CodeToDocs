import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { verifyToken, verifyAnonToken, AppTokenUser } from '../utils/appToken';

/**
 * Resolve the authenticated user from the request. Prefers the signed bearer
 * token (works cross-origin on *.run.app); falls back to the session cookie
 * (used same-origin / in local dev). Returns null if not authenticated.
 */
export function getAuthUser(req: Request): AppTokenUser | null {
  const header = req.headers['authorization'];
  if (header && header.startsWith('Bearer ')) {
    const user = verifyToken(header.slice('Bearer '.length));
    if (user) return user;
  }

  if (req.session?.user) {
    return req.session.user as AppTokenUser;
  }

  return null;
}

/**
 * Middleware to check if user is authenticated
 * Requires a valid session with user information
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!getAuthUser(req)) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'Please log in to access this resource',
    });
  }

  next();
}

/**
 * Helper to get user ID from request
 * Identity is derived ONLY from the signed session cookie. We deliberately do not
 * trust any client-supplied identity header: GitHub numeric IDs are public, so a
 * header-based identity would let anyone impersonate anyone.
 * Returns null if not authenticated.
 */
export function getUserId(req: Request): number | null {
  return getAuthUser(req)?.id ?? null;
}

/**
 * Identity to use for storing/scoping a user's documents. For authenticated
 * users this is their GitHub id. For anonymous users it is a stable, random,
 * negative id (so it never collides with a real GitHub id), which keeps one
 * anonymous user's documents isolated from another's.
 *
 * Preference order: (1) a signed user token/session wins; (2) a signed anon
 * bearer token - this is what survives cross-site cookie blocking on
 * Safari/Firefox, since it travels in the Authorization header instead of a
 * cookie; (3) the legacy session-cookie anonId, kept for sessions that predate
 * the anon token and for same-origin/local dev where the cookie still works;
 * (4) 0 if there's no session at all.
 */
export function getStorageUserId(req: Request): number {
  const userId = getUserId(req);
  if (userId) {
    return userId;
  }

  const header = req.headers['authorization'];
  if (header && header.startsWith('Bearer ')) {
    const anonId = verifyAnonToken(header.slice('Bearer '.length));
    if (anonId !== null) {
      return anonId;
    }
  }

  if (req.session) {
    if (!req.session.anonId) {
      // 1..2^31-1, negated. crypto.randomInt is unbiased.
      req.session.anonId = -crypto.randomInt(1, 2_147_483_647);
    }
    return req.session.anonId;
  }

  return 0;
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
