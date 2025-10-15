import express, { Request, Response, Router } from 'express';
import { settingsService, ClaudeModel } from '../services/settingsService';

const router: Router = express.Router();

/**
 * GET /api/settings
 * Get current user settings
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const settings = settingsService.getSettings();
    res.json(settings);
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
 * Get current Claude model
 */
router.get('/model', (req: Request, res: Response) => {
  try {
    const model = settingsService.getClaudeModel();
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
router.post('/model', (req: Request, res: Response) => {
  try {
    const { model } = req.body;

    if (!model) {
      return res.status(400).json({
        error: 'Model is required',
      });
    }

    // Validate model
    const validModels: ClaudeModel[] = [
      'claude-sonnet-4-20250514',
      'claude-haiku-4-5-20251001',
      'claude-3-5-haiku-20241022',
    ];

    if (!validModels.includes(model)) {
      return res.status(400).json({
        error: 'Invalid model',
        validModels,
      });
    }

    settingsService.setClaudeModel(model);

    res.json({
      success: true,
      model: settingsService.getClaudeModel(),
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
router.patch('/', (req: Request, res: Response) => {
  try {
    const updates = req.body;

    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({
        error: 'No settings provided',
      });
    }

    const updatedSettings = settingsService.updateSettings(updates);

    res.json({
      success: true,
      settings: updatedSettings,
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
router.post('/reset', (req: Request, res: Response) => {
  try {
    const settings = settingsService.resetSettings();

    res.json({
      success: true,
      settings,
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
