import express, { Request, Response, Router } from 'express';
import { settingsService, ALLOWED_MODELS, DEFAULT_MODEL } from '../services/settingsService';
import { requireAuth, getUserId, getStorageUserId } from '../middleware/auth';

const router: Router = express.Router();

const ALLOWED_MODEL_IDS: string[] = ALLOWED_MODELS.map((m) => m.id);

/**
 * GET /api/settings/models
 * List the models a user may choose from. Public - the frontend uses this
 * instead of hardcoding model ids/labels.
 */
router.get('/models', (req: Request, res: Response) => {
  res.json({ models: ALLOWED_MODELS, default: DEFAULT_MODEL });
});

/**
 * GET /api/settings
 * Get current user settings. Works for anonymous users (returns the default).
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const claudeModel = await settingsService.getClaudeModel(getStorageUserId(req));
    res.json({ claudeModel });
  } catch (error) {
    console.error('Error getting settings:', error);
    res.status(500).json({
      error: 'Failed to retrieve settings',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/settings/model
 * Get current Claude model. Works for anonymous users (returns the default).
 */
router.get('/model', async (req: Request, res: Response) => {
  try {
    const model = await settingsService.getClaudeModel(getStorageUserId(req));
    res.json({ model });
  } catch (error) {
    console.error('Error getting model:', error);
    res.status(500).json({
      error: 'Failed to retrieve model',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/settings/model
 * Update Claude model preference
 */
router.post('/model', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { model } = req.body;

    if (!model) {
      return res.status(400).json({
        error: 'Model is required',
      });
    }

    if (!ALLOWED_MODEL_IDS.includes(model)) {
      return res.status(400).json({
        error: 'Invalid model',
        validModels: ALLOWED_MODEL_IDS,
      });
    }

    await settingsService.setClaudeModel(userId, model);

    res.json({
      success: true,
      model: await settingsService.getClaudeModel(userId),
    });
  } catch (error) {
    console.error('Error updating model:', error);
    res.status(500).json({
      error: 'Failed to update model',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * PATCH /api/settings
 * Update user settings
 */
router.patch('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const updates = req.body;

    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({
        error: 'No settings provided',
      });
    }

    if (updates.claudeModel !== undefined) {
      if (!ALLOWED_MODEL_IDS.includes(updates.claudeModel)) {
        return res.status(400).json({
          error: 'Invalid model',
          validModels: ALLOWED_MODEL_IDS,
        });
      }
      await settingsService.setClaudeModel(userId, updates.claudeModel);
    }

    res.json({
      success: true,
      settings: { claudeModel: await settingsService.getClaudeModel(userId) },
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({
      error: 'Failed to update settings',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/settings/reset
 * Reset settings to defaults
 */
router.post('/reset', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    await settingsService.setClaudeModel(userId, DEFAULT_MODEL);

    res.json({
      success: true,
      settings: { claudeModel: DEFAULT_MODEL },
    });
  } catch (error) {
    console.error('Error resetting settings:', error);
    res.status(500).json({
      error: 'Failed to reset settings',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
