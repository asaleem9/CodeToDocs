import { db } from '../db/connection';
import { userSettings, users, type UserSettings, type NewUserSettings } from '../db/schema';
import { eq } from 'drizzle-orm';

export interface ClaudeSettings {
  model: string;
  additionalSettings?: Record<string, any>;
}

/**
 * Database-backed settings service
 * Stores user preferences and configuration
 */
export class SettingsServiceDb {
  /**
   * Get settings for a user
   */
  async getSettings(githubUsername: string): Promise<ClaudeSettings> {
    if (!db) {
      // Return defaults if database not available
      return {
        model: 'claude-haiku-4-5-20251001',
        additionalSettings: {},
      };
    }

    try {
      // Find user
      const user = await db.query.users.findFirst({
        where: eq(users.githubUsername, githubUsername),
      });

      if (!user) {
        // Return defaults for unknown user
        return {
          model: 'claude-haiku-4-5-20251001',
          additionalSettings: {},
        };
      }

      // Get user settings
      const settings = await db.query.userSettings.findFirst({
        where: eq(userSettings.userId, user.id),
      });

      if (!settings) {
        // Create default settings
        const [newSettings] = await db.insert(userSettings).values({
          userId: user.id,
          claudeModel: 'claude-haiku-4-5-20251001',
          additionalSettings: {},
        }).returning();

        return {
          model: newSettings.claudeModel || 'claude-haiku-4-5-20251001',
          additionalSettings: (newSettings.additionalSettings as any) || {},
        };
      }

      return {
        model: settings.claudeModel || 'claude-haiku-4-5-20251001',
        additionalSettings: (settings.additionalSettings as any) || {},
      };
    } catch (error) {
      console.error('Error getting settings:', error);
      // Return defaults on error
      return {
        model: 'claude-haiku-4-5-20251001',
        additionalSettings: {},
      };
    }
  }

  /**
   * Update settings for a user
   */
  async updateSettings(githubUsername: string, newSettings: Partial<ClaudeSettings>): Promise<void> {
    if (!db) {
      console.warn('Database not available, settings not persisted');
      return;
    }

    try {
      // Find user
      const user = await db.query.users.findFirst({
        where: eq(users.githubUsername, githubUsername),
      });

      if (!user) {
        throw new Error(`User not found: ${githubUsername}`);
      }

      // Check if settings exist
      const existingSettings = await db.query.userSettings.findFirst({
        where: eq(userSettings.userId, user.id),
      });

      if (existingSettings) {
        // Update existing settings
        await db.update(userSettings)
          .set({
            claudeModel: newSettings.model || existingSettings.claudeModel,
            additionalSettings: newSettings.additionalSettings !== undefined
              ? newSettings.additionalSettings as any
              : existingSettings.additionalSettings,
            updatedAt: new Date(),
          })
          .where(eq(userSettings.userId, user.id));

        console.log(`✓ Settings updated for user: ${githubUsername}`);
      } else {
        // Create new settings
        await db.insert(userSettings).values({
          userId: user.id,
          claudeModel: newSettings.model || 'claude-haiku-4-5-20251001',
          additionalSettings: (newSettings.additionalSettings || {}) as any,
        });

        console.log(`✓ Settings created for user: ${githubUsername}`);
      }
    } catch (error) {
      console.error('Error updating settings:', error);
      throw error;
    }
  }

  /**
   * Reset settings to defaults
   */
  async resetSettings(githubUsername: string): Promise<void> {
    await this.updateSettings(githubUsername, {
      model: 'claude-haiku-4-5-20251001',
      additionalSettings: {},
    });
  }

  /**
   * Get Claude model for a user (convenience method)
   */
  async getClaudeModel(githubUsername: string): Promise<string> {
    const settings = await this.getSettings(githubUsername);
    return settings.model;
  }

  /**
   * Update Claude model for a user (convenience method)
   */
  async updateClaudeModel(githubUsername: string, model: string): Promise<void> {
    await this.updateSettings(githubUsername, { model });
  }
}

// Export singleton instance
export const settingsServiceDb = new SettingsServiceDb();
