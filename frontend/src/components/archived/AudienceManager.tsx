import React, { useState, useEffect, useCallback } from 'react';
import apiService from '../../services/api';

interface Audience {
  id: string;
  name: string;
  description?: string;
  total_urls: number;
  estimated_contacts: number;
  status: 'pending' | 'scraping' | 'ready' | 'error';
  last_scraped_at?: string;
  scraping_progress: number;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

interface AudienceUrl {
  id: string;
  url: string;
  notes?: string;
  status: string;
  total_contacts: number;
}

const AudienceManager: React.FC = () => {
  const [audiences, setAudiences] = useState<Audience[]>([]);
  const [selectedAudience, setSelectedAudience] = useState<Audience | null>(null);
  const [audienceUrls, setAudienceUrls] = useState<AudienceUrl[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Form states
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showAddUrlForm, setShowAddUrlForm] = useState(false);
  const [newAudience, setNewAudience] = useState({
    name: '',
    description: ''
  });
  const [newUrl, setNewUrl] = useState({
    url: '',
    notes: ''
  });

  const loadAudiences = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiService.getAudiences();
      setAudiences(response.audiences);
    } catch (error: any) {
      showMessage('error', 'Failed to load audiences');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAudiences();
  }, [loadAudiences]);

  const loadAudienceUrls = async (audienceId: string) => {
    try {
      const response = await apiService.getAudienceUrls(audienceId);
      setAudienceUrls(response.urls);
    } catch (error: any) {
      showMessage('error', 'Failed to load audience URLs');
    }
  };

  const handleSelectAudience = (audience: Audience) => {
    setSelectedAudience(audience);
    loadAudienceUrls(audience.id);
  };

  const handleCreateAudience = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await apiService.createAudience(newAudience);
      setNewAudience({ name: '', description: '' });
      setShowCreateForm(false);
      loadAudiences();
      showMessage('success', 'Audience created successfully');
    } catch (error: any) {
      showMessage('error', error.response?.data?.detail || 'Failed to create audience');
    } finally {
      setLoading(false);
    }
  };

  const handleAddUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAudience) return;
    
    try {
      setLoading(true);
      await apiService.addUrlToAudience(selectedAudience.id, newUrl);
      setNewUrl({ url: '', notes: '' });
      setShowAddUrlForm(false);
      loadAudienceUrls(selectedAudience.id);
      loadAudiences(); // Refresh to update URL counts
      showMessage('success', 'URL added to audience');
    } catch (error: any) {
      showMessage('error', error.response?.data?.detail || 'Failed to add URL');
    } finally {
      setLoading(false);
    }
  };

  const handleScrapeAudience = async (audienceId: string) => {
    try {
      setLoading(true);
      await apiService.scrapeAudience(audienceId);
      loadAudiences();
      showMessage('success', 'Scraping started for audience');
    } catch (error: any) {
      showMessage('error', error.response?.data?.detail || 'Failed to start scraping');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAudience = async (audienceId: string) => {
    if (!window.confirm('Are you sure you want to delete this audience?')) return;
    
    try {
      setLoading(true);
      await apiService.deleteAudience(audienceId);
      loadAudiences();
      if (selectedAudience?.id === audienceId) {
        setSelectedAudience(null);
        setAudienceUrls([]);
      }
      showMessage('success', 'Audience deleted successfully');
    } catch (error: any) {
      showMessage('error', error.response?.data?.detail || 'Failed to delete audience');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready': return 'green';
      case 'scraping': return 'blue';
      case 'error': return 'red';
      default: return 'gray';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ready': return '✅';
      case 'scraping': return '🔄';
      case 'error': return '❌';
      default: return '⏳';
    }
  };

  return (
    <div className="component-container">
      <div className="header-section">
        <div>
          <h2>Audience Manager</h2>
          <p className="component-description">
            Create and manage target audiences with Apollo links. Use these audiences in your email and phone campaigns.
          </p>
        </div>
        <button 
          onClick={() => setShowCreateForm(true)}
          className="btn btn-primary"
          disabled={loading}
        >
          + Create Audience
        </button>
      </div>

      {message && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="audience-layout">
        {/* Audiences List */}
        <div className="audiences-panel">
          <h3>Your Audiences ({audiences.length})</h3>
          
          {loading && audiences.length === 0 ? (
            <div className="loading">Loading audiences...</div>
          ) : audiences.length === 0 ? (
            <div className="empty-state">
              <p>No audiences created yet.</p>
              <p>Create your first audience to get started!</p>
            </div>
          ) : (
            <div className="audience-cards">
              {audiences.map(audience => (
                <div 
                  key={audience.id}
                  className={`audience-card ${selectedAudience?.id === audience.id ? 'selected' : ''}`}
                  onClick={() => handleSelectAudience(audience)}
                >
                  <div className="audience-header">
                    <h4>{audience.name}</h4>
                    <span className={`status-badge ${getStatusColor(audience.status)}`}>
                      {getStatusIcon(audience.status)} {audience.status}
                    </span>
                  </div>
                  
                  {audience.description && (
                    <p className="audience-description">{audience.description}</p>
                  )}
                  
                  <div className="audience-stats">
                    <div className="stat">
                      <span className="stat-label">URLs:</span>
                      <span className="stat-value">{audience.total_urls}</span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">Contacts:</span>
                      <span className="stat-value">{audience.estimated_contacts.toLocaleString()}</span>
                    </div>
                  </div>

                  {audience.status === 'scraping' && (
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{ width: `${audience.scraping_progress}%` }}
                      ></div>
                      <span className="progress-text">{audience.scraping_progress}%</span>
                    </div>
                  )}

                  <div className="audience-actions">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleScrapeAudience(audience.id);
                      }}
                      className="btn btn-small btn-secondary"
                      disabled={loading || audience.status === 'scraping'}
                    >
                      {audience.status === 'scraping' ? 'Scraping...' : 'Scrape'}
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteAudience(audience.id);
                      }}
                      className="btn btn-small btn-danger"
                      disabled={loading}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Audience Details */}
        {selectedAudience && (
          <div className="audience-details">
            <div className="details-header">
              <h3>{selectedAudience.name}</h3>
              <button 
                onClick={() => setShowAddUrlForm(true)}
                className="btn btn-secondary"
                disabled={loading}
              >
                + Add URLs
              </button>
            </div>

            <div className="audience-urls">
              <h4>Apollo URLs ({audienceUrls.length})</h4>
              {audienceUrls.length === 0 ? (
                <div className="empty-state">
                  <p>No URLs added yet.</p>
                  <p>Add Apollo links to start building this audience.</p>
                </div>
              ) : (
                <div className="url-list">
                  {audienceUrls.map(urlItem => (
                    <div key={urlItem.id} className="url-item">
                      <div className="url-info">
                        <a href={urlItem.url} target="_blank" rel="noopener noreferrer" className="url-link">
                          {urlItem.url}
                        </a>
                        {urlItem.notes && <p className="url-notes">{urlItem.notes}</p>}
                      </div>
                      <div className="url-stats">
                        <span className="contact-count">{urlItem.total_contacts} contacts</span>
                        <span className={`url-status ${urlItem.status}`}>{urlItem.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Create Audience Modal */}
      {showCreateForm && (
        <div className="modal-overlay" onClick={() => setShowCreateForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create New Audience</h3>
              <button 
                onClick={() => setShowCreateForm(false)}
                className="close-btn"
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleCreateAudience}>
              <div className="form-group">
                <label htmlFor="audience-name">Audience Name *</label>
                <input
                  id="audience-name"
                  type="text"
                  value={newAudience.name}
                  onChange={(e) => setNewAudience(prev => ({...prev, name: e.target.value}))}
                  placeholder="e.g. Tech Startups in SF"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="audience-description">Description</label>
                <textarea
                  id="audience-description"
                  value={newAudience.description}
                  onChange={(e) => setNewAudience(prev => ({...prev, description: e.target.value}))}
                  placeholder="Describe your target audience..."
                  rows={3}
                />
              </div>

              <div className="modal-actions">
                <button 
                  type="button" 
                  onClick={() => setShowCreateForm(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading || !newAudience.name.trim()}
                >
                  {loading ? 'Creating...' : 'Create Audience'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add URL Modal */}
      {showAddUrlForm && selectedAudience && (
        <div className="modal-overlay" onClick={() => setShowAddUrlForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add URLs to {selectedAudience.name}</h3>
              <button 
                onClick={() => setShowAddUrlForm(false)}
                className="close-btn"
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleAddUrl}>
              <div className="form-group">
                <label htmlFor="url">Apollo URL *</label>
                <input
                  id="url"
                  type="url"
                  value={newUrl.url}
                  onChange={(e) => setNewUrl(prev => ({...prev, url: e.target.value}))}
                  placeholder="https://app.apollo.io/..."
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="url-notes">Notes</label>
                <input
                  id="url-notes"
                  type="text"
                  value={newUrl.notes}
                  onChange={(e) => setNewUrl(prev => ({...prev, notes: e.target.value}))}
                  placeholder="Optional notes about this search..."
                />
              </div>

              <div className="modal-actions">
                <button 
                  type="button" 
                  onClick={() => setShowAddUrlForm(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading || !newUrl.url.trim()}
                >
                  {loading ? 'Adding...' : 'Add URL'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AudienceManager;