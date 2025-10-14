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
  }
}
