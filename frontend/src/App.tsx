import { useState, useEffect } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { api, Repository, Summary, User } from './api';
import Settings from './Settings';
import './App.css';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<number | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  // Check authentication on mount
  useEffect(() => {
    checkAuth();
  }, []);

  // Load repositories when user is authenticated
  useEffect(() => {
    if (user) {
      loadRepositories();
    }
  }, [user]);

  // Load summary when repository is selected
  useEffect(() => {
    if (selectedRepo) {
      loadSummary(selectedRepo);
    }
  }, [selectedRepo]);

  async function checkAuth() {
    try {
      const currentUser = await api.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadRepositories() {
    try {
      const repos = await api.getSelectedRepositories();
      setRepositories(repos);
      if (repos.length > 0 && !selectedRepo) {
        setSelectedRepo(repos[0].id);
      }
    } catch (error) {
      console.error('Failed to load repositories:', error);
      setError('Failed to load repositories');
    }
  }

  function handleSettingsUpdate() {
    loadRepositories();
  }

  async function loadSummary(repoId: number) {
    setLoadingSummary(true);
    setError(null);
    try {
      const summaryData = await api.getLatestSummary(repoId);
      setSummary(summaryData);
    } catch (error) {
      console.error('Failed to load summary:', error);
      setError('Failed to load summary');
    } finally {
      setLoadingSummary(false);
    }
  }

  function handleRepoChange(event: React.ChangeEvent<HTMLSelectElement>) {
    setSelectedRepo(Number(event.target.value));
  }

  function handleLogin() {
    window.location.href = api.getLoginUrl();
  }

  async function handleGenerateSummary() {
    if (!selectedRepo) return;
    
    setGenerating(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      // Generate summary (this now includes ingestion)
      await api.generateSummary(selectedRepo);
      
      setSuccessMessage('Generating summary from latest GitHub activity... This may take 10-15 seconds.');
      
      // Poll for the new summary
      let attempts = 0;
      const maxAttempts = 6; // 30 seconds total (6 * 5 seconds)
      
      const pollInterval = setInterval(async () => {
        attempts++;
        
        try {
          const newSummary = await api.getLatestSummary(selectedRepo);
          
          // Check if it's a new summary (different from current)
          if (newSummary && (!summary || newSummary.id !== summary.id || newSummary.created_at !== summary.created_at)) {
            setSummary(newSummary);
            setSuccessMessage('Summary generated successfully with latest data!');
            clearInterval(pollInterval);
            
            setTimeout(() => setSuccessMessage(null), 3000);
          } else if (attempts >= maxAttempts) {
            clearInterval(pollInterval);
            setSuccessMessage('Summary generation is taking longer than expected. Refresh the page to see the result.');
          }
        } catch (error) {
          console.error('Error polling for summary:', error);
          if (attempts >= maxAttempts) {
            clearInterval(pollInterval);
            setError('Failed to load the new summary. Please refresh the page.');
          }
        }
      }, 5000);
    } catch (error) {
      console.error('Failed to generate summary:', error);
      setError('Failed to generate summary');
    } finally {
      setGenerating(false);
    }
  }

  function enhanceWithLinks(text: string, repoFullName: string): string {
    const [owner, repo] = repoFullName.split('/');
    const baseUrl = `https://github.com/${owner}/${repo}`;
    
    let enhanced = text;
    
    // Convert Issue numbers: Issue #123 or issue #123
    enhanced = enhanced.replace(
      /\b(?:Issue|issue)\s*#(\d+)\b/g,
      `[$&](${baseUrl}/issues/$1)`
    );
    
    // Convert PR numbers: PR #123 or pull request #123
    enhanced = enhanced.replace(
      /\b(?:PR|pull request|pr)\s*#(\d+)\b/gi,
      `[$&](${baseUrl}/pull/$1)`
    );
    
    // Convert remaining #123 to issues (more common than PRs)
    enhanced = enhanced.replace(
      /(?<!\/)\b#(\d+)\b/g,
      `[#$1](${baseUrl}/issues/$1)`
    );
    
    // Convert commit SHAs (7+ hex characters)
    enhanced = enhanced.replace(
      /\b([0-9a-f]{7,40})\b/g,
      `[$1](${baseUrl}/commit/$1)`
    );
    
    // Convert @username mentions
    enhanced = enhanced.replace(
      /@([a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38})\b/g,
      '[@$1](https://github.com/$1)'
    );
    
    return enhanced;
  }

  if (loading) {
    return (
      <div className="app">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="app">
        <div className="login-container">
          <div className="login-card">
            <h1 className="login-title">
              Dev<span className="logo-pulse">Pulse</span>
            </h1>
            <p className="login-subtitle">
              AI-powered engineering insights from your GitHub activity
            </p>
            <button className="button" onClick={handleLogin}>
              Sign in with GitHub
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <a href="/" className="logo">
            Dev<span className="logo-pulse">Pulse</span>
          </a>
          <div className="header-right">
            <button
              className="button button-secondary button-small"
              onClick={() => setShowSettings(true)}
            >
              ⚙️ Manage Repositories
            </button>
            <div className="user-info">
              <div className="user-avatar">
                {user.username.charAt(0).toUpperCase()}
              </div>
              <span>{user.username}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="main">
        {error && <div className="error">{error}</div>}
        {successMessage && <div className="success">{successMessage}</div>}

        {repositories.length === 0 ? (
          <div className="empty-state">
            <h2 className="empty-state-title">No Repositories Selected</h2>
            <p className="empty-state-text">
              Please select repositories to monitor from your account settings.
            </p>
          </div>
        ) : (
          <>
            <div className="repo-selector">
              <div className="repo-selector-header">
                <label className="repo-selector-label" htmlFor="repo-select">
                  Select Repository
                </label>
                <button
                  className="button button-small"
                  onClick={handleGenerateSummary}
                  disabled={generating || !selectedRepo}
                >
                  {generating ? 'Generating...' : 'Generate New Summary'}
                </button>
              </div>
              <select
                id="repo-select"
                className="repo-select"
                value={selectedRepo || ''}
                onChange={handleRepoChange}
              >
                {repositories.map((repo) => (
                  <option key={repo.id} value={repo.id}>
                    {repo.full_name}
                  </option>
                ))}
              </select>
            </div>

            {loadingSummary ? (
              <div className="loading">Loading summary...</div>
            ) : summary ? (
              <div className="summary-card">
                <div className="summary-header">
                  <h1 className="summary-title">Weekly Engineering Summary</h1>
                  <div className="summary-meta">
                    {new Date(summary.week_start).toLocaleDateString()} -{' '}
                    {new Date(summary.week_end).toLocaleDateString()}
                  </div>
                </div>
                <div className="summary-content">
                  <Markdown remarkPlugins={[remarkGfm]}>
                    {enhanceWithLinks(
                      summary.summary_text,
                      repositories.find((r) => r.id === selectedRepo)?.full_name || ''
                    )}
                  </Markdown>
                </div>
              </div>
            ) : (
              <div className="empty-state">
                <h2 className="empty-state-title">No Summary Available</h2>
                <p className="empty-state-text">
                  No weekly summary has been generated for this repository yet.
                </p>
                <p className="empty-state-text">
                  Run <code>npm run summary {user.userId}</code> to generate one.
                </p>
              </div>
            )}
          </>
        )}
      </main>

      {showSettings && (
        <Settings
          onClose={() => setShowSettings(false)}
          onUpdate={handleSettingsUpdate}
        />
      )}
    </div>
  );
}

export default App;
