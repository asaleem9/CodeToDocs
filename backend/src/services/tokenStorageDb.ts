import { db } from '../db/connection';
import { users, userTokens, type User, type UserToken } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { encrypt, decrypt } from '../utils/encryption';

export interface UserInfo {
  githubId: number;
  githubUsername: string;
  githubEmail?: string;
  avatarUrl?: string;
  name?: string;
}

/**
 * Database-backed token storage service
 * Stores GitHub OAuth tokens securely with encryption
 */
export class TokenStorageDb {
  /**
   * Store or update a GitHub token for a user
   */
  async storeToken(userInfo: UserInfo, token: string): Promise<void> {
    if (!db) {
      throw new Error('Database not initialized');
    }

    try {
      // Encrypt the token before storing
      const encryptedToken = encrypt(token);

      // First, find or create the user
      let user = await db.query.users.findFirst({
        where: eq(users.githubId, userInfo.githubId),
      });

      if (!user) {
        // Create new user
        const [newUser] = await db.insert(users).values({
          githubId: userInfo.githubId,
          githubUsername: userInfo.githubUsername,
          githubEmail: userInfo.githubEmail,
          avatarUrl: userInfo.avatarUrl,
          name: userInfo.name,
        }).returning();
        user = newUser;
      } else {
        // Update existing user info
        await db.update(users)
          .set({
            githubUsername: userInfo.githubUsername,
            githubEmail: userInfo.githubEmail,
            avatarUrl: userInfo.avatarUrl,
            name: userInfo.name,
            updatedAt: new Date(),
          })
          .where(eq(users.id, user.id));
      }

      // Now handle the token
      const existingToken = await db.query.userTokens.findFirst({
        where: eq(userTokens.userId, user.id),
      });

      if (existingToken) {
        // Update existing token
        await db.update(userTokens)
          .set({
            accessToken: encryptedToken,
            updatedAt: new Date(),
          })
          .where(eq(userTokens.id, existingToken.id));
      } else {
        // Create new token
        await db.insert(userTokens).values({
          userId: user.id,
          accessToken: encryptedToken,
          tokenType: 'oauth',
        });
      }

      console.log(`✓ Token stored for user: ${userInfo.githubUsername}`);
    } catch (error) {
      console.error('Error storing token:', error);
      throw error;
    }
  }

  /**
   * Retrieve a token for a GitHub user
   */
  async getToken(githubUsername: string): Promise<string | undefined> {
    if (!db) {
      return undefined;
    }

    try {
      // Find user by username
      const user = await db.query.users.findFirst({
        where: eq(users.githubUsername, githubUsername),
      });

      if (!user) {
        return undefined;
      }

      // Find token for user
      const token = await db.query.userTokens.findFirst({
        where: eq(userTokens.userId, user.id),
      });

      if (!token) {
        return undefined;
      }

      // Decrypt and return token
      return decrypt(token.accessToken);
    } catch (error) {
      console.error('Error retrieving token:', error);
      return undefined;
    }
  }

  /**
   * Remove a token for a user
   */
  async removeToken(githubUsername: string): Promise<void> {
    if (!db) {
      return;
    }

    try {
      // Find user by username
      const user = await db.query.users.findFirst({
        where: eq(users.githubUsername, githubUsername),
      });

      if (!user) {
        return;
      }

      // Delete token
      await db.delete(userTokens).where(eq(userTokens.userId, user.id));
      console.log(`✓ Token removed for user: ${githubUsername}`);
    } catch (error) {
      console.error('Error removing token:', error);
      throw error;
    }
  }

  /**
   * Check if a token exists for a user
   */
  async hasToken(githubUsername: string): Promise<boolean> {
    const token = await this.getToken(githubUsername);
    return token !== undefined;
  }

  /**
   * Get user info by GitHub username
   */
  async getUserInfo(githubUsername: string): Promise<User | undefined> {
    if (!db) {
      return undefined;
    }

    try {
      return await db.query.users.findFirst({
        where: eq(users.githubUsername, githubUsername),
      });
    } catch (error) {
      console.error('Error getting user info:', error);
      return undefined;
    }
  }

  /**
   * Get user info by GitHub ID
   */
  async getUserInfoById(githubId: number): Promise<User | undefined> {
    if (!db) {
      return undefined;
    }

    try {
      return await db.query.users.findFirst({
        where: eq(users.githubId, githubId),
      });
    } catch (error) {
      console.error('Error getting user info by ID:', error);
      return undefined;
    }
  }
}

// Export singleton instance
export const tokenStorageDb = new TokenStorageDb();
