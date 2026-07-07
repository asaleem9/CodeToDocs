/**
 * Settings service for managing per-user preferences (Claude model choice).
 * Hybrid database + in-memory cache, mirroring the pattern used by
 * tokenStorage/storageService: writes go to the cache and the database,
 * reads check the cache first and fall back to the database.
 */

import { settingsServiceDb } from './settingsServiceDb';

export const ALLOWED_MODELS = [
  { id: 'claude-sonnet-5', label: 'Claude Sonnet 5' },
  { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5' },
] as const;

export type ClaudeModelId = typeof ALLOWED_MODELS[number]['id'];

export const DEFAULT_MODEL: ClaudeModelId = 'claude-haiku-4-5-20251001';

const ALLOWED_MODEL_IDS = new Set<string>(ALLOWED_MODELS.map((m) => m.id));

/**
 * Resolve a stored model id to a valid one, falling back to the default for
 * anything unrecognized (e.g. a model that's since been dropped from ALLOWED_MODELS).
 */
function resolveModel(model: string | null | undefined): string {
  return model && ALLOWED_MODEL_IDS.has(model) ? model : DEFAULT_MODEL;
}

class SettingsService {
  // In-memory cache for faster access and fallback when database unavailable
  private cache: Map<number, string> = new Map();

  /**
   * Get a user's Claude model preference. Anonymous users (id <= 0) always get
   * the default - they have no account to store a preference against.
   */
  async getClaudeModel(userId: number): Promise<string> {
    if (userId <= 0) {
      return DEFAULT_MODEL;
    }

    if (this.cache.has(userId)) {
      return resolveModel(this.cache.get(userId));
    }

    let model: string | undefined;
    try {
      model = await settingsServiceDb.getClaudeModelByGithubId(userId);
    } catch (error) {
      console.error('Error reading Claude model from database:', error);
    }

    if (model) {
      this.cache.set(userId, model);
    }

    return resolveModel(model);
  }

  /**
   * Set a user's Claude model preference. Ignored for anonymous users (id <= 0) -
   * the routes already require auth before calling this.
   */
  async setClaudeModel(userId: number, model: string): Promise<void> {
    if (userId <= 0) {
      return;
    }

    this.cache.set(userId, model);

    try {
      await settingsServiceDb.updateClaudeModelByGithubId(userId, model);
    } catch (error) {
      console.error('Error persisting Claude model to database:', error);
    }
  }
}

// Export singleton instance
export const settingsService = new SettingsService();
