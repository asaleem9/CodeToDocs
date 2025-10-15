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

dotenv.config();

// Debug: Check if API key is loaded
console.log('ANTHROPIC_API_KEY loaded:', process.env.ANTHROPIC_API_KEY ? 'Yes (length: ' + process.env.ANTHROPIC_API_KEY.length + ')' : 'No');

const app: Express = express();
const port = process.env.PORT || 3001;
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

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

app.listen(port, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});
