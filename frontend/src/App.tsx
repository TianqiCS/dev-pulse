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
  const [allSummaries, setAllSummaries] = useState<Summary[]>([]);
  const [currentSummaryIndex, setCurrentSummaryIndex] = useState(0);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [timeRange, setTimeRange] = useState<number>(7); // Default to 7 days (weekly)

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

  // Load all summaries when repository is selected
  useEffect(() => {
    if (selectedRepo) {
      loadAllSummaries(selectedRepo);
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

  async function loadAllSummaries(repoId: number) {
    setLoadingSummary(true);
    setError(null);
    try {
      const summaries = await api.getAllSummariesForRepo(repoId);
      setAllSummaries(summaries);
      setCurrentSummaryIndex(0);
    } catch (error) {
      console.error('Failed to load summaries:', error);
      setError('Failed to load summaries');
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
      await api.generateSummary(selectedRepo, timeRange);
      setSuccessMessage(`Generating summary from latest ${timeRange} days of GitHub activity... This may take 10-15 seconds.`);
      
      // Poll for the new summary
      let attempts = 0;
      const maxAttempts = 6;
      
      const pollInterval = setInterval(async () => {
        attempts++;
        
        try {
          const summaries = await api.getAllSummariesForRepo(selectedRepo);
          
          // Check if we have new summaries
          if (summaries.length > allSummaries.length || 
              (summaries.length > 0 && allSummaries.length > 0 && summaries[0].id !== allSummaries[0].id)) {
            setAllSummaries(summaries);
            setCurrentSummaryIndex(0);
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

  async function handleDeleteSummary() {
    const currentSummary = allSummaries[currentSummaryIndex];
    if (!currentSummary || !selectedRepo) return;

    if (!confirm('Are you sure you want to delete this summary?')) {
      return;
    }

    try {
      await api.deleteSummary(currentSummary.id);
      setSuccessMessage('Summary deleted successfully');
      await loadAllSummaries(selectedRepo);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Failed to delete summary:', error);
      setError('Failed to delete summary');
    }
  }

  function handlePreviousSummary() {
    if (currentSummaryIndex < allSummaries.length - 1) {
      setCurrentSummaryIndex(currentSummaryIndex + 1);
    }
  }

  function handleNextSummary() {
    if (currentSummaryIndex > 0) {
      setCurrentSummaryIndex(currentSummaryIndex - 1);
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
                <div className="generate-controls">
                  <select
                    className="time-range-select"
                    value={timeRange}
                    onChange={(e) => setTimeRange(Number(e.target.value))}
                  >
                    <option value={7}>Last 7 days</option>
                    <option value={14}>Last 14 days</option>
                    <option value={30}>Last 30 days</option>
                  </select>
                  <button
                    className="button button-small"
                    onClick={handleGenerateSummary}
                    disabled={generating || !selectedRepo}
                  >
                    {generating ? 'Generating...' : 'Generate New Summary'}
                  </button>
                </div>
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
              <div className="loading">Loading summaries...</div>
            ) : allSummaries.length > 0 ? (
              <div className="summary-card">
                <div className="summary-header">
                  <div>
                    <h1 className="summary-title">Engineering Summary</h1>
                    <div className="summary-meta">
                      {new Date(allSummaries[currentSummaryIndex].week_start).toLocaleDateString()} -{' '}
                      {new Date(allSummaries[currentSummaryIndex].week_end).toLocaleDateString()}
                    </div>
                  </div>
                  <button
                    className="button button-small button-danger"
                    onClick={handleDeleteSummary}
                  >
                    🗑️ Delete
                  </button>
                </div>
                <div className="summary-content">
                  <Markdown remarkPlugins={[remarkGfm]}>
                    {enhanceWithLinks(
                      allSummaries[currentSummaryIndex].summary_text,
                      repositories.find((r) => r.id === selectedRepo)?.full_name || ''
                    )}
                  </Markdown>
                </div>
                <div className="summary-navigation">
                  <button
                    className="button button-small button-secondary"
                    onClick={handlePreviousSummary}
                    disabled={currentSummaryIndex >= allSummaries.length - 1}
                  >
                    ← Previous
                  </button>
                  <span className="summary-counter">
                    {currentSummaryIndex + 1} of {allSummaries.length}
                  </span>
                  <button
                    className="button button-small button-secondary"
                    onClick={handleNextSummary}
                    disabled={currentSummaryIndex <= 0}
                  >
                    Next →
                  </button>
                </div>
              </div>
            ) : (
              <div className="empty-state">
                <h2 className="empty-state-title">No Summary Available</h2>
                <p className="empty-state-text">
                  No weekly summary has been generated for this repository yet.
                </p>
                <p className="empty-state-text">
                  Click "Generate New Summary" to create one.
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
