import axios from 'axios';

export interface GitHubUser {
  id: number;
  login: string;
  name: string;
  email: string;
  avatar_url: string;
  html_url: string;
}

export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  description: string;
  html_url: string;
  clone_url: string;
  language: string;
  stargazers_count: number;
  updated_at: string;
  private: boolean;
}

/**
 * Exchange GitHub OAuth code for access token
 */
export async function exchangeCodeForToken(code: string): Promise<string> {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('GitHub OAuth credentials not configured');
  }

  try {
    const response = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: clientId,
        client_secret: clientSecret,
        code,
      },
      {
        headers: {
          Accept: 'application/json',
        },
      }
    );

    if (response.data.error) {
      throw new Error(response.data.error_description || 'Failed to exchange code for token');
    }

    return response.data.access_token;
  } catch (error: any) {
    console.error('Error exchanging code for token:', error.message);
    throw new Error('Failed to authenticate with GitHub');
  }
}

/**
 * Get GitHub user information using access token
 */
export async function getGitHubUser(accessToken: string): Promise<GitHubUser> {
  try {
    const response = await axios.get('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });

    return response.data;
  } catch (error: any) {
    console.error('Error fetching GitHub user:', error.message);
    throw new Error('Failed to fetch user information from GitHub');
  }
}

/**
 * Get user's GitHub repositories
 */
export async function getUserRepositories(
  accessToken: string,
  page: number = 1,
  perPage: number = 30
): Promise<GitHubRepository[]> {
  try {
    const response = await axios.get('https://api.github.com/user/repos', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
      params: {
        page,
        per_page: perPage,
        sort: 'updated',
        affiliation: 'owner,collaborator',
      },
    });

    return response.data;
  } catch (error: any) {
    console.error('Error fetching GitHub repositories:', error.message);
    throw new Error('Failed to fetch repositories from GitHub');
  }
}

/**
 * Get a specific repository by owner and name
 */
export async function getRepository(
  accessToken: string,
  owner: string,
  repo: string
): Promise<GitHubRepository> {
  try {
    const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });

    return response.data;
  } catch (error: any) {
    console.error('Error fetching repository:', error.message);
    throw new Error('Failed to fetch repository from GitHub');
  }
}
