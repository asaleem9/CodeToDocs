/**
 * Token Storage Service
 * Stores and retrieves GitHub OAuth access tokens for users
 *
 * In production, this should be replaced with a secure database-backed solution
 * with encryption at rest for token storage.
 */

interface TokenData {
  accessToken: string;
  username: string;
  storedAt: Date;
}

class TokenStorage {
  // In-memory storage: userId -> TokenData
  // In production, replace with database (e.g., PostgreSQL, Redis)
  private tokens: Map<number, TokenData> = new Map();

  /**
   * Store a user's GitHub OAuth token
   */
  store(userId: number, accessToken: string, username: string): void {
    this.tokens.set(userId, {
      accessToken,
      username,
      storedAt: new Date(),
    });

    console.log(`✓ Stored OAuth token for user ${userId} (${username})`);
  }

  /**
   * Retrieve a user's GitHub OAuth token
   */
  get(userId: number): string | null {
    const tokenData = this.tokens.get(userId);

    if (!tokenData) {
      console.log(`No OAuth token found for user ${userId}`);
      return null;
    }

    return tokenData.accessToken;
  }

  /**
   * Get token by username (for webhook lookup by repo owner)
   */
  getByUsername(username: string): string | null {
    for (const [userId, tokenData] of this.tokens.entries()) {
      if (tokenData.username.toLowerCase() === username.toLowerCase()) {
        console.log(`Found OAuth token for username ${username} (userId: ${userId})`);
        return tokenData.accessToken;
      }
    }

    console.log(`No OAuth token found for username ${username}`);
    return null;
  }

  /**
   * Remove a user's token (e.g., on logout)
   */
  remove(userId: number): void {
    const tokenData = this.tokens.get(userId);
    if (tokenData) {
      this.tokens.delete(userId);
      console.log(`Removed OAuth token for user ${userId} (${tokenData.username})`);
    }
  }

  /**
   * Check if a user has a stored token
   */
  has(userId: number): boolean {
    return this.tokens.has(userId);
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
    console.log('Cleared all stored OAuth tokens');
  }
}

// Export singleton instance
export const tokenStorage = new TokenStorage();
