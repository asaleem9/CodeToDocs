import { tokenStorageDb, type UserInfo } from './tokenStorageDb';

/**
 * Token Storage Service - Hybrid Database + In-Memory
 * Stores and retrieves GitHub OAuth access tokens for users
 *
 * Uses database for persistence, with in-memory cache as fallback
 */

interface TokenData {
  accessToken: string;
  username: string;
  storedAt: Date;
}

class TokenStorage {
  // In-memory cache for faster access and fallback when database unavailable
  private tokens: Map<number, TokenData> = new Map();

  /**
   * Store a user's GitHub OAuth token
   * Stores in both database and in-memory cache
   */
  async store(userId: number, accessToken: string, username: string, userInfo?: Partial<UserInfo>): Promise<void> {
    // Store in memory immediately
    this.tokens.set(userId, {
      accessToken,
      username,
      storedAt: new Date(),
    });

    console.log(`✓ Stored OAuth token in memory for user ${userId} (${username})`);

    // Try to store in database
    try {
      await tokenStorageDb.storeToken({
        githubId: userId,
        githubUsername: username,
        githubEmail: userInfo?.githubEmail,
        avatarUrl: userInfo?.avatarUrl,
        name: userInfo?.name,
      }, accessToken);
    } catch (error) {
      console.error('Failed to store token in database, using memory only:', error);
    }
  }

  /**
   * Retrieve a user's GitHub OAuth token
   * Tries database first, falls back to memory
   */
  async get(userId: number): Promise<string | null> {
    // Try database first
    try {
      // We need username to query database, check memory cache
      const memoryData = this.tokens.get(userId);
      if (memoryData) {
        const dbToken = await tokenStorageDb.getToken(memoryData.username);
        if (dbToken) {
          return dbToken;
        }
      }
    } catch (error) {
      console.error('Error fetching token from database:', error);
    }

    // Fall back to memory
    const tokenData = this.tokens.get(userId);
    if (!tokenData) {
      console.log(`No OAuth token found for user ${userId}`);
      return null;
    }

    return tokenData.accessToken;
  }

  /**
   * Get token by username (for webhook lookup by repo owner)
   * Tries database first, falls back to memory
   */
  async getByUsername(username: string): Promise<string | null> {
    // Try database first
    try {
      const dbToken = await tokenStorageDb.getToken(username);
      if (dbToken) {
        console.log(`Found OAuth token for username ${username} in database`);
        return dbToken;
      }
    } catch (error) {
      console.error('Error fetching token from database:', error);
    }

    // Fall back to memory
    for (const [userId, tokenData] of this.tokens.entries()) {
      if (tokenData.username.toLowerCase() === username.toLowerCase()) {
        console.log(`Found OAuth token for username ${username} (userId: ${userId}) in memory`);
        return tokenData.accessToken;
      }
    }

    console.log(`No OAuth token found for username ${username}`);
    return null;
  }

  /**
   * Remove a user's token (e.g., on logout)
   * Removes from both database and memory
   */
  async remove(userId: number): Promise<void> {
    const tokenData = this.tokens.get(userId);

    // Remove from memory
    if (tokenData) {
      this.tokens.delete(userId);
      console.log(`Removed OAuth token from memory for user ${userId} (${tokenData.username})`);

      // Remove from database
      try {
        await tokenStorageDb.removeToken(tokenData.username);
      } catch (error) {
        console.error('Failed to remove token from database:', error);
      }
    }
  }

  /**
   * Check if a user has a stored token
   * Checks both database and memory
   */
  async has(userId: number): Promise<boolean> {
    // Check memory first (faster)
    if (this.tokens.has(userId)) {
      return true;
    }

    // Check database
    try {
      const memoryData = this.tokens.get(userId);
      if (memoryData) {
        return await tokenStorageDb.hasToken(memoryData.username);
      }
    } catch (error) {
      console.error('Error checking token in database:', error);
    }

    return false;
  }

  /**
   * Get all stored usernames (for debugging)
   */
  getAllUsernames(): string[] {
    return Array.from(this.tokens.values()).map(data => data.username);
  }

  /**
   * Clear all tokens (for testing)
   */
  clear(): void {
    this.tokens.clear();
    console.log('Cleared all stored OAuth tokens from memory');
  }
}

// Export singleton instance
export const tokenStorage = new TokenStorage();
