import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import documentationRoutes from './routes/documentation';
import webhookRoutes from './routes/webhook';
import batchRoutes from './routes/batch';
import integrationsRoutes from './routes/integrations';

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

// Body parser
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

app.listen(port, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});
