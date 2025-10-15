/**
 * Settings service for managing user preferences
 * Using in-memory storage for simplicity
 */

export type ClaudeModel = 'claude-sonnet-4-20250514' | 'claude-haiku-4-5-20251001' | 'claude-3-5-haiku-20241022';

export interface UserSettings {
  claudeModel: ClaudeModel;
}

class SettingsService {
  private settings: UserSettings;

  constructor() {
    // Default to Haiku 4.5 for best performance and cost
    this.settings = {
      claudeModel: 'claude-haiku-4-5-20251001',
    };
  }

  /**
   * Get current settings
   */
  getSettings(): UserSettings {
    return { ...this.settings };
  }

  /**
   * Get the current Claude model
   */
  getClaudeModel(): ClaudeModel {
    return this.settings.claudeModel;
  }

  /**
   * Update Claude model preference
   */
  setClaudeModel(model: ClaudeModel): void {
    this.settings.claudeModel = model;
    console.log(`Claude model updated to: ${model}`);
  }

  /**
   * Update all settings
   */
  updateSettings(newSettings: Partial<UserSettings>): UserSettings {
    this.settings = {
      ...this.settings,
      ...newSettings,
    };
    console.log('Settings updated:', this.settings);
    return this.getSettings();
  }

  /**
   * Reset settings to defaults
   */
  resetSettings(): UserSettings {
    this.settings = {
      claudeModel: 'claude-haiku-4-5-20251001',
    };
    console.log('Settings reset to defaults');
    return this.getSettings();
  }
}

// Export singleton instance
export const settingsService = new SettingsService();
