import { useState, useEffect } from 'react';
import { api, Repository } from './api';
import './Settings.css';

interface SettingsProps {
  onClose: () => void;
  onUpdate: () => void;
}

function Settings({ onClose, onUpdate }: SettingsProps) {
  const [allRepos, setAllRepos] = useState<Repository[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    loadRepositories();
  }, []);

  async function loadRepositories() {
    setLoading(true);
    setError(null);
    try {
      const repos = await api.getAllRepositories();
      setAllRepos(repos);
      setSelectedIds(new Set(repos.filter((r) => r.is_selected).map((r) => r.id)));
    } catch (error) {
      console.error('Failed to load repositories:', error);
      setError('Failed to load repositories');
    } finally {
      setLoading(false);
    }
  }

  async function handleSync() {
    setSyncing(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const repos = await api.syncRepositories();
      setAllRepos(repos);
      setSuccessMessage(`Synced ${repos.length} repositories from GitHub`);
    } catch (error) {
      console.error('Failed to sync repositories:', error);
      setError('Failed to sync repositories from GitHub');
    } finally {
      setSyncing(false);
    }
  }

  function handleToggle(repoId: number) {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(repoId)) {
      newSelected.delete(repoId);
    } else {
      if (newSelected.size >= 3) {
        setError('Maximum 3 repositories can be selected');
        return;
      }
      newSelected.add(repoId);
    }
    setSelectedIds(newSelected);
    setError(null);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccessMessage(null);
    try {
      await api.selectRepositories(Array.from(selectedIds));
      setSuccessMessage('Repository selection saved successfully');
      setTimeout(() => {
        onUpdate();
        onClose();
      }, 1000);
    } catch (error) {
      console.error('Failed to save selection:', error);
      setError('Failed to save repository selection');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="settings-overlay">
        <div className="settings-modal">
          <div className="loading">Loading repositories...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>Manage Repositories</h2>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="settings-content">
          {error && <div className="error">{error}</div>}
          {successMessage && <div className="success">{successMessage}</div>}

          <div className="settings-actions">
            <button
              className="button button-secondary"
              onClick={handleSync}
              disabled={syncing}
            >
              {syncing ? 'Syncing...' : 'Sync from GitHub'}
            </button>
            <div className="settings-info">
              Selected: {selectedIds.size} / 3 repositories
            </div>
          </div>

          <div className="repo-list">
            {allRepos.length === 0 ? (
              <div className="empty-state">
                <p>No repositories found. Click "Sync from GitHub" to fetch your repositories.</p>
              </div>
            ) : (
              allRepos.map((repo) => (
                <div
                  key={repo.id}
                  className={`repo-item ${selectedIds.has(repo.id) ? 'selected' : ''}`}
                  onClick={() => handleToggle(repo.id)}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(repo.id)}
                    onChange={() => handleToggle(repo.id)}
                    className="repo-checkbox"
                  />
                  <div className="repo-info">
                    <div className="repo-name">{repo.full_name}</div>
                    <div className="repo-owner">{repo.owner}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="settings-footer">
          <button className="button button-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="button"
            onClick={handleSave}
            disabled={saving || selectedIds.size === 0}
          >
            {saving ? 'Saving...' : 'Save Selection'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Settings;
