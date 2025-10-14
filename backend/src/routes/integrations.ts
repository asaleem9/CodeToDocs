import express, { Request, Response } from 'express';
import {
  exportToNotion,
  exportToConfluence,
  syncToGitHubWiki,
  generateReadme,
  createReadmeInRepo,
  sendSlackNotification,
  checkIntegrations,
} from '../utils/integrations';

const router = express.Router();

/**
 * POST /api/integrations/notion
 * Export documentation to Notion
 */
router.post('/notion', async (req: Request, res: Response) => {
  try {
    const { markdown, title, config } = req.body;

    if (!markdown || !title || !config?.token) {
      return res.status(400).json({
        error: 'Missing required fields: markdown, title, config.token',
      });
    }

    const result = await exportToNotion(markdown, title, config);

    if (result.success) {
      res.json({ success: true, url: result.url });
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error: any) {
    console.error('Error exporting to Notion:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/integrations/confluence
 * Export documentation to Confluence
 */
router.post('/confluence', async (req: Request, res: Response) => {
  try {
    const { markdown, title, config } = req.body;

    if (!markdown || !title || !config?.baseUrl || !config?.email || !config?.apiToken) {
      return res.status(400).json({
        error: 'Missing required fields: markdown, title, config (baseUrl, email, apiToken, spaceKey)',
      });
    }

    const result = await exportToConfluence(markdown, title, config);

    if (result.success) {
      res.json({ success: true, url: result.url });
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error: any) {
    console.error('Error exporting to Confluence:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/integrations/github-wiki
 * Sync documentation to GitHub Wiki
 */
router.post('/github-wiki', async (req: Request, res: Response) => {
  try {
    const { markdown, pageName, config } = req.body;

    if (!markdown || !pageName || !config?.token || !config?.owner || !config?.repo) {
      return res.status(400).json({
        error: 'Missing required fields: markdown, pageName, config (token, owner, repo)',
      });
    }

    const result = await syncToGitHubWiki(markdown, pageName, config);

    if (result.success) {
      res.json({ success: true, url: result.url });
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error: any) {
    console.error('Error syncing to GitHub Wiki:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/integrations/readme
 * Generate README.md
 */
router.post('/readme', async (req: Request, res: Response) => {
  try {
    const { options } = req.body;

    if (!options?.projectName || !options?.documentation) {
      return res.status(400).json({
        error: 'Missing required fields: options (projectName, documentation)',
      });
    }

    const readme = generateReadme(options);

    res.json({ success: true, readme });
  } catch (error: any) {
    console.error('Error generating README:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/integrations/readme/create
 * Create or update README.md in a GitHub repository
 */
router.post('/readme/create', async (req: Request, res: Response) => {
  try {
    const { readme, config } = req.body;

    if (!readme || !config?.token || !config?.owner || !config?.repo) {
      return res.status(400).json({
        error: 'Missing required fields: readme, config (token, owner, repo)',
      });
    }

    const result = await createReadmeInRepo(readme, config);

    if (result.success) {
      res.json({ success: true, url: result.url });
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error: any) {
    console.error('Error creating README:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/integrations/slack
 * Send Slack notification
 */
router.post('/slack', async (req: Request, res: Response) => {
  try {
    const { config, options } = req.body;

    if (!config?.webhookUrl || !options?.title || !options?.message) {
      return res.status(400).json({
        error: 'Missing required fields: config.webhookUrl, options (title, message)',
      });
    }

    const result = await sendSlackNotification(config, options);

    if (result.success) {
      res.json({ success: true });
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error: any) {
    console.error('Error sending Slack notification:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/integrations/check
 * Check which integrations are configured
 */
router.post('/check', (req: Request, res: Response) => {
  try {
    const { config } = req.body;

    const status = checkIntegrations(config || {});

    res.json(status);
  } catch (error: any) {
    console.error('Error checking integrations:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
