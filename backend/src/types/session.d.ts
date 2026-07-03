import 'express-session';

declare module 'express-session' {
  interface SessionData {
    user?: {
      id: number;
      login: string;
      name: string;
      email: string;
      avatar_url: string;
      html_url: string;
    };
    accessToken?: string;
    // Stable per-session id for anonymous users so their documents are isolated
    // from other anonymous sessions. Negative to never collide with GitHub ids.
    anonId?: number;
  }
}
