import crypto from 'crypto';

/**
 * Stateless, signed application session tokens.
 *
 * The frontend and backend run on different *.run.app origins (cross-site), so a
 * session cookie is unreliable (Safari/Firefox block third-party cookies). Instead
 * the backend issues an HMAC-signed token at login that the client sends in the
 * Authorization header. It is verified server-side, so - unlike the old
 * X-GitHub-User-ID header - it cannot be forged without the server secret.
 *
 * Note: this token only identifies the user to THIS app. The GitHub OAuth access
 * token never leaves the server.
 */

const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function getSecret(): string {
  // Shares the session secret; required in production (see index.ts boot guard).
  return process.env.SESSION_SECRET || 'your-secret-key-change-in-production';
}

function base64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlToBuffer(str: string): Buffer {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(padded, 'base64');
}

export interface AppTokenUser {
  id: number;
  login: string;
  name: string;
  email: string;
  avatar_url: string;
  html_url: string;
}

/**
 * Create a signed token embedding the user's public profile and an expiry.
 */
export function signToken(user: AppTokenUser, now: number = Date.now()): string {
  const payload = { user, iat: now, exp: now + TOKEN_TTL_MS };
  const body = base64url(Buffer.from(JSON.stringify(payload)));
  const sig = base64url(crypto.createHmac('sha256', getSecret()).update(body).digest());
  return `${body}.${sig}`;
}

/**
 * Verify a token's signature and expiry. Returns the user, or null if invalid.
 */
export function verifyToken(token: string, now: number = Date.now()): AppTokenUser | null {
  if (!token || typeof token !== 'string') return null;

  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [body, sig] = parts;
  const expected = base64url(crypto.createHmac('sha256', getSecret()).update(body).digest());

  const provided = Buffer.from(sig);
  const expectedBuf = Buffer.from(expected);
  if (provided.length !== expectedBuf.length || !crypto.timingSafeEqual(provided, expectedBuf)) {
    return null;
  }

  let payload: any;
  try {
    payload = JSON.parse(base64urlToBuffer(body).toString('utf8'));
  } catch {
    return null;
  }

  if (!payload || typeof payload.exp !== 'number' || payload.exp < now || !payload.user) {
    return null;
  }

  return payload.user as AppTokenUser;
}
