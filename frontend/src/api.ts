interface Repository {
  id: number;
  name: string;
  full_name: string;
  owner: string;
  is_selected: boolean;
}

interface Summary {
  id: number;
  repo_id: number;
  week_start: string;
  week_end: string;
  summary_text: string;
  model_version: string;
  created_at: string;
}

interface User {
  userId: number;
  username: string;
}

class ApiClient {
  private baseUrl = '';

  async getCurrentUser(): Promise<User | null> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/me`, {
        credentials: 'include',
      });
      if (response.status === 401) {
        return null;
      }
      if (!response.ok) {
        throw new Error('Failed to fetch user');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching user:', error);
      return null;
    }
  }

  async getSelectedRepositories(): Promise<Repository[]> {
    const response = await fetch(`${this.baseUrl}/repositories/selected`, {
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error('Failed to fetch repositories');
    }
    const data = await response.json();
    return data.repositories;
  }

  async getLatestSummary(repoId: number): Promise<Summary | null> {
    try {
      const response = await fetch(`${this.baseUrl}/summaries/repo/${repoId}/latest`, {
        credentials: 'include',
      });
      if (response.status === 404) {
        return null;
      }
      if (!response.ok) {
        throw new Error('Failed to fetch summary');
      }
      const data = await response.json();
      return data.summary;
    } catch (error) {
      console.error('Error fetching summary:', error);
      return null;
    }
  }

  async getAllSummariesForRepo(repoId: number): Promise<Summary[]> {
    const response = await fetch(`${this.baseUrl}/summaries/repo/${repoId}`, {
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error('Failed to fetch summaries');
    }
    const data = await response.json();
    return data.summaries;
  }

  async getAllRepositories(): Promise<Repository[]> {
    const response = await fetch(`${this.baseUrl}/repositories`, {
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error('Failed to fetch repositories');
    }
    const data = await response.json();
    return data.repositories;
  }

  async syncRepositories(): Promise<Repository[]> {
    const response = await fetch(`${this.baseUrl}/repositories/sync`, {
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error('Failed to sync repositories');
    }
    const data = await response.json();
    return data.repositories;
  }

  async selectRepositories(repositoryIds: number[]): Promise<void> {
    const response = await fetch(`${this.baseUrl}/repositories/select`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ repositoryIds }),
    });
    if (!response.ok) {
      throw new Error('Failed to select repositories');
    }
  }

  async generateSummary(repoId: number, daysBack: number = 7): Promise<void> {
    const response = await fetch(`${this.baseUrl}/summaries/repo/${repoId}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ daysBack }),
    });
    if (!response.ok) {
      throw new Error('Failed to generate summary');
    }
  }

  async triggerIngestion(): Promise<void> {
    const response = await fetch(`${this.baseUrl}/ingestion/trigger`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error('Failed to trigger ingestion');
    }
  }

  getLoginUrl(): string {
    return `${this.baseUrl}/auth/github`;
  }
}

export const api = new ApiClient();
export type { Repository, Summary, User };
