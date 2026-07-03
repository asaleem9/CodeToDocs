import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import documentationRoutes from './routes/documentation';
import webhookRoutes from './routes/webhook';
import batchRoutes from './routes/batch';
import integrationsRoutes from './routes/integrations';
import authRoutes from './routes/auth';
import settingsRoutes from './routes/settings';
import { checkDatabaseConnection, closeDatabaseConnection } from './db/connection';

dotenv.config();

// In production, refuse to boot without the secrets that protect sessions and
// stored OAuth tokens. Falling back to the well-known defaults would make
// sessions forgeable and stored tokens decryptable.
if (process.env.NODE_ENV === 'production') {
  const missing: string[] = [];
  if (!process.env.SESSION_SECRET) missing.push('SESSION_SECRET');
  if (!process.env.DATABASE_ENCRYPTION_KEY) missing.push('DATABASE_ENCRYPTION_KEY');
  if (missing.length > 0) {
    console.error(`Refusing to start: missing required environment variables in production: ${missing.join(', ')}`);
    process.exit(1);
  }
}

// Confirm the Anthropic key is present (without logging any key material).
console.log('ANTHROPIC_API_KEY loaded:', process.env.ANTHROPIC_API_KEY ? 'Yes' : 'No');

// Check database connection on startup
checkDatabaseConnection().then(connected => {
  if (connected) {
    console.log('✓ Database persistence enabled');
  } else {
    console.log('⚠ Database not available, using in-memory storage only');
  }
});

const app: Express = express();
const port = process.env.PORT || 3001;
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

// Behind Cloud Run / a reverse proxy so req.ip and secure cookies reflect the
// real client connection (needed for correct rate limiting and cookie flags).
app.set('trust proxy', 1);

// CORS configuration
app.use(cors({
  origin: frontendUrl,
  credentials: true
}));

// Cookie parser
app.use(cookieParser());

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    },
  })
);

// Body parser - use raw body for webhook routes to verify signature
app.use('/api/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    message: 'CodeToDocsAI Backend API is running',
    timestamp: new Date().toISOString()
  });
});

// Documentation routes
app.use('/api', documentationRoutes);

// Webhook routes
app.use('/api/webhook', webhookRoutes);

// Batch processing routes
app.use('/api/batch', batchRoutes);

// Integrations routes
app.use('/api/integrations', integrationsRoutes);

// Auth routes
app.use('/api/auth', authRoutes);

// Settings routes
app.use('/api/settings', settingsRoutes);

const server = app.listen(port, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});

// Graceful shutdown
const shutdown = async (signal: string) => {
  console.log(`\n${signal} received, closing server gracefully...`);

  server.close(async () => {
    console.log('HTTP server closed');

    // Close database connection
    await closeDatabaseConnection();

    process.exit(0);
  });

  // Force close after 10s
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
