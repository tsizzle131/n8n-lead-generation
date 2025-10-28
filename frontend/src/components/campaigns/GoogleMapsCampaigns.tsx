import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useCampaigns, type Campaign } from '../../hooks';
import '../../styles/GoogleMapsCampaigns.css';

interface CampaignFormData {
  name: string;
  location: string;
  keywords: string;
  coverage_profile: 'budget' | 'balanced' | 'aggressive';
}

interface ProductConfig {
  product_name?: string;
  product_description?: string;
  value_proposition?: string;
  target_audience?: string;
  industry?: string;
  messaging_tone?: string;
}

const GoogleMapsCampaigns: React.FC = () => {
  // Use TanStack Query for campaigns data
  const {
    data: campaigns = [],
    isLoading,
    isError,
    error: queryError,
    isFetching,
    refetch
  } = useCampaigns();

  const queryClient = useQueryClient();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState<CampaignFormData>({
    name: '',
    location: '',
    keywords: '',
    coverage_profile: 'balanced'
  });
  const [executing, setExecuting] = useState<string | null>(null);
  const [creatingCampaign, setCreatingCampaign] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [productConfig, setProductConfig] = useState<ProductConfig | null>(null);
  const [loadingProductConfig, setLoadingProductConfig] = useState(true);
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(null);

  // Load current organization and product config
  useEffect(() => {
    const loadProductConfig = async () => {
      try {
        // First get current organization
        const orgResponse = await fetch('http://localhost:5001/current-organization');
        if (orgResponse.ok) {
          const orgData = await orgResponse.json();
          setCurrentOrgId(orgData.organizationId);

          // Then load product config
          if (orgData.organizationId) {
            const configResponse = await fetch(`http://localhost:5001/organizations/${orgData.organizationId}/product-config`);
            if (configResponse.ok) {
              const config = await configResponse.json();
              setProductConfig(config);
            }
          }
        }
      } catch (err) {
        console.error('Error loading product config:', err);
      } finally {
        setLoadingProductConfig(false);
      }
    };

    loadProductConfig();
  }, []);

  // Calculate product config completion percentage
  const calculateConfigCompletion = (): number => {
    if (!productConfig) return 0;

    const requiredFields = [
      'product_name',
      'product_description',
      'value_proposition',
      'target_audience'
    ];

    const filledFields = requiredFields.filter(field =>
      productConfig[field as keyof ProductConfig] &&
      String(productConfig[field as keyof ProductConfig]).trim().length > 0
    );

    return Math.round((filledFields.length / requiredFields.length) * 100);
  };

  const configCompletion = calculateConfigCompletion();
  const isProductConfigComplete = configCompletion === 100;

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingCampaign(true);
    setError(null);

    try {
      // Parse keywords (comma-separated)
      const keywordsArray = formData.keywords.split(',').map(k => k.trim()).filter(k => k);

      const response = await fetch('http://localhost:5001/api/gmaps/campaigns/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          location: formData.location,
          keywords: keywordsArray,
          coverage_profile: formData.coverage_profile
        })
      });

      const result = await response.json();

      // Check for errors - display detailed message if available
      if (!response.ok || result.error) {
        const errorMessage = result.message || result.error || 'Failed to create campaign';
        const errorDetails = result.details ? `\n\nDetails: ${result.details}` : '';
        throw new Error(errorMessage + errorDetails);
      }

      // Reset form and invalidate queries to trigger refresh
      setFormData({ name: '', location: '', keywords: '', coverage_profile: 'balanced' });
      setShowCreateForm(false);
      await queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create campaign');
    } finally {
      setCreatingCampaign(false);
    }
  };

  const handleExecuteCampaign = async (campaignId: string) => {
    setExecuting(campaignId);
    setError(null);

    // Optimistically update to "running" status
    queryClient.setQueryData(['campaigns'], (old: Campaign[] | undefined) =>
      old?.map(c => c.id === campaignId
        ? { ...c, status: 'running', started_at: new Date().toISOString() }
        : c
      )
    );

    try {
      const response = await fetch(`http://localhost:5001/api/gmaps/campaigns/${campaignId}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ max_businesses_per_zip: 50 })
      });

      if (!response.ok) throw new Error('Failed to execute campaign');

      const result = await response.json();

      if (result.error) {
        throw new Error(result.error);
      }

      // Query will auto-refetch due to polling
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to execute campaign');
      // Revert optimistic update on error
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    } finally {
      setExecuting(null);
    }
  };

  const handleExportCSV = async (campaignId: string, campaignName: string) => {
    try {
      const response = await fetch(`http://localhost:5001/api/gmaps/campaigns/${campaignId}/export`);

      if (!response.ok) {
        throw new Error('Failed to export campaign data');
      }

      // Get the filename from the Content-Disposition header if available
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `gmaps-export-${campaignName.replace(/[^a-zA-Z0-9]/g, '_')}.csv`;

      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // Convert response to blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export campaign data');
    }
  };

  const handleExportToInstantly = async (campaignId: string, campaignName: string) => {
    const confirmed = window.confirm(
      `Export "${campaignName}" to Instantly.ai?\n\n` +
      `This will automatically create a new campaign in your Instantly account with:\n` +
      `• All leads with emails\n` +
      `• AI-generated icebreakers and subject lines\n` +
      `• Default email sequence template\n\n` +
      `Note: You must have at least one sending email account configured in Instantly.ai`
    );

    if (!confirmed) return;

    try {
      setError(null);
      const exportCampaignName = `${campaignName} - ${new Date().toISOString().split('T')[0]}`;

      const response = await fetch(`http://localhost:5001/api/gmaps/campaigns/${campaignId}/export-to-instantly`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignName: exportCampaignName,
          timezone: 'America/Chicago',
          hoursFrom: '09:00',
          hoursTo: '17:00'
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Export failed');
      }

      alert(
        `✅ Successfully exported to Instantly.ai!\n\n` +
        `Campaign: ${result.campaign_name}\n` +
        `Leads exported: ${result.leads_exported}/${result.total_businesses}\n\n` +
        `View campaign:\n${result.campaign_url}`
      );

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to export to Instantly';
      setError(errorMessage);
      alert(`❌ Export failed: ${errorMessage}`);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusClasses: Record<string, string> = {
      draft: 'badge-secondary',
      running: 'badge-warning',
      completed: 'badge-success',
      failed: 'badge-danger',
      paused: 'badge-info'
    };
    return `badge ${statusClasses[status] || 'badge-secondary'}`;
  };

  const formatCost = (cost: number | string | null | undefined) => {
    if (cost === null || cost === undefined) {
      return '$0.00';
    }
    // Convert string to number if needed
    const numCost = typeof cost === 'string' ? parseFloat(cost) : cost;
    if (isNaN(numCost)) {
      return '$0.00';
    }
    return `$${numCost.toFixed(2)}`;
  };

  // Show error UI with retry button
  if (isError) {
    return (
      <div className="gmaps-campaigns">
        <div className="page-header">
          <h2>Google Maps Campaigns</h2>
        </div>
        <div className="error-container">
          <h3>Failed to load campaigns</h3>
          <p>{queryError?.message || 'An error occurred while fetching campaigns'}</p>
          <button className="btn btn-primary" onClick={() => refetch()}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="gmaps-campaigns">
      <div className="page-header">
        <h2>Google Maps Campaigns</h2>
        <button
          className="btn btn-primary"
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          {showCreateForm ? 'Cancel' : '+ New Campaign'}
        </button>
      </div>

      {/* Product Configuration Warning Banner */}
      {!loadingProductConfig && !isProductConfigComplete && (
        <div className="alert alert-warning" style={{
          margin: '20px 0',
          padding: '15px 20px',
          borderLeft: '4px solid #f59e0b',
          backgroundColor: '#fffbeb'
        }}>
          <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
            <span style={{ fontSize: '24px' }}>⚠️</span>
            <div style={{ flex: 1 }}>
              <h4 style={{ margin: '0 0 8px 0', color: '#92400e' }}>
                Product Configuration Incomplete ({configCompletion}% Complete)
              </h4>
              <p style={{ margin: '0 0 12px 0', color: '#78350f' }}>
                <strong>Your AI-generated emails will be generic without product details!</strong>
                {' '}Complete your product configuration to generate highly personalized,
                conversion-optimized icebreakers and subject lines.
              </p>
              <div style={{ marginBottom: '12px' }}>
                <div style={{
                  height: '8px',
                  backgroundColor: '#fef3c7',
                  borderRadius: '4px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    height: '100%',
                    width: `${configCompletion}%`,
                    backgroundColor: configCompletion < 50 ? '#ef4444' : configCompletion < 100 ? '#f59e0b' : '#10b981',
                    transition: 'width 0.3s ease'
                  }}></div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {currentOrgId && (
                  <a
                    href="/organizations"
                    className="btn btn-warning"
                    style={{
                      padding: '8px 16px',
                      fontSize: '14px',
                      textDecoration: 'none',
                      backgroundColor: '#f59e0b',
                      color: 'white'
                    }}
                  >
                    📝 Complete Product Setup
                  </a>
                )}
                <div style={{
                  padding: '8px 12px',
                  fontSize: '12px',
                  color: '#92400e',
                  backgroundColor: '#fef3c7',
                  borderRadius: '4px'
                }}>
                  Missing: {['product_name', 'product_description', 'value_proposition', 'target_audience']
                    .filter(field => !productConfig?.[field as keyof ProductConfig] ||
                                    !String(productConfig[field as keyof ProductConfig]).trim())
                    .map(field => field.replace('_', ' '))
                    .join(', ')}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Background refresh indicator */}
      {isFetching && campaigns.length > 0 && (
        <div className="refresh-indicator">
          <span className="spinner-small"></span> Refreshing...
        </div>
      )}

      {error && (
        <div className="alert alert-danger">
          {error}
        </div>
      )}

      {showCreateForm && (
        <div className="create-campaign-form">
          <h3>Create New Campaign</h3>
          <form onSubmit={handleCreateCampaign}>
            <div className="form-group">
              <label>Campaign Name</label>
              <input
                type="text"
                className="form-control"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="e.g., LA Restaurants Campaign"
                required
              />
            </div>

            <div className="form-group">
              <label>Location</label>
              <input
                type="text"
                className="form-control"
                value={formData.location}
                onChange={(e) => setFormData({...formData, location: e.target.value})}
                placeholder="e.g., 10001 or 90210"
                required
              />
              <small className="form-text">
                <strong>Tip:</strong> Use ZIP codes for best results (e.g., 10001, 33101)
              </small>
            </div>

            <div className="form-group">
              <label>Keywords</label>
              <input
                type="text"
                className="form-control"
                value={formData.keywords}
                onChange={(e) => setFormData({...formData, keywords: e.target.value})}
                placeholder="e.g., restaurant, cafe, bakery"
                required
              />
              <small className="form-text">Comma-separated business types to search</small>
            </div>

            <div className="form-group">
              <label>Coverage Profile</label>
              <select
                className="form-control"
                value={formData.coverage_profile}
                onChange={(e) => setFormData({...formData, coverage_profile: e.target.value as any})}
              >
                <option value="budget">Budget (85% coverage)</option>
                <option value="balanced">Balanced (94% coverage)</option>
                <option value="aggressive">Aggressive (99% coverage)</option>
              </select>
              <small className="form-text">Higher coverage = more ZIP codes = higher cost</small>
            </div>

            <div className="form-actions">
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={creatingCampaign}
              >
                {creatingCampaign ? 'Creating...' : 'Create Campaign'}
              </button>
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={() => setShowCreateForm(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="campaigns-list">
        <h3>Your Campaigns</h3>

        {/* Only show loading on initial load, not background refreshes */}
        {isLoading && campaigns.length === 0 ? (
          <div className="loading">Loading campaigns...</div>
        ) : campaigns.length === 0 ? (
          <div className="empty-state">
            <p>No campaigns yet. Create your first campaign to start scraping local businesses!</p>
          </div>
        ) : (
          <div className="campaigns-grid">
            {campaigns.map(campaign => (
              <div key={campaign.id} className="campaign-card">
                <div className="campaign-header">
                  <h4>{campaign.name}</h4>
                  <span className={getStatusBadge(campaign.status)}>
                    {campaign.status}
                  </span>
                </div>

                <div className="campaign-details">
                  <div className="detail-row">
                    <span className="label">Location:</span>
                    <span className="value">{campaign.location}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Keywords:</span>
                    <span className="value">{(campaign.keywords || []).join(', ')}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">ZIP Codes:</span>
                    <span className="value">{campaign.target_zip_count || 0}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Est. Cost:</span>
                    <span className="value">{formatCost(campaign.estimated_cost || 0)}</span>
                  </div>
                </div>

                {campaign.status === 'completed' && (
                  <div className="campaign-results">
                    <h5>Results</h5>
                    <div className="results-grid">
                      <div className="result-item">
                        <span className="result-value">{campaign.total_businesses_found || 0}</span>
                        <span className="result-label">Businesses</span>
                      </div>
                      <div className="result-item">
                        <span className="result-value">{campaign.total_facebook_pages_found || 0}</span>
                        <span className="result-label">Facebook Pages</span>
                      </div>
                      <div className="result-item">
                        <span className="result-value">{campaign.total_emails_found || 0}</span>
                        <span className="result-label">Total Emails</span>
                      </div>
                      <div className="result-item">
                        <span className="result-value">{formatCost(campaign.actual_cost || 0)}</span>
                        <span className="result-label">Actual Cost</span>
                      </div>
                    </div>

                    {campaign.total_linkedin_profiles_found !== undefined && campaign.total_linkedin_profiles_found > 0 && (
                      <div className="linkedin-enrichment-section">
                        <h5>LinkedIn Enrichment</h5>
                        <div className="results-grid">
                          <div className="result-item">
                            <span className="result-value">{campaign.total_linkedin_profiles_found || 0}</span>
                            <span className="result-label">Profiles Found</span>
                          </div>
                          <div className="result-item">
                            <span className="result-value">{campaign.linkedin_verified_emails || 0}</span>
                            <span className="result-label">Verified Emails</span>
                          </div>
                        </div>

                        {campaign.linkedin_verified_emails !== undefined && campaign.linkedin_verified_emails > 0 && (
                          <div className="email-deliverability">
                            <h6>Email Deliverability</h6>
                            <div className="deliverability-stats">
                              <div className="deliverability-item deliverable">
                                <span className="deliverability-value">{campaign.linkedin_deliverable_emails || 0}</span>
                                <span className="deliverability-label">Deliverable</span>
                              </div>
                              <div className="deliverability-item risky">
                                <span className="deliverability-value">{campaign.linkedin_risky_emails || 0}</span>
                                <span className="deliverability-label">Risky</span>
                              </div>
                              <div className="deliverability-item undeliverable">
                                <span className="deliverability-value">{campaign.linkedin_undeliverable_emails || 0}</span>
                                <span className="deliverability-label">Undeliverable</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="campaign-actions">
                  {campaign.status === 'draft' && (
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => handleExecuteCampaign(campaign.id)}
                      disabled={executing === campaign.id}
                    >
                      {executing === campaign.id ? 'Executing...' : 'Execute Campaign'}
                    </button>
                  )}
                  {campaign.status === 'running' && (
                    <div className="running-indicator">
                      <span className="spinner"></span>
                      <div className="progress-info">
                        <div>Campaign is running...</div>
                        {campaign.total_businesses_found && campaign.total_businesses_found > 0 && (
                          <div className="progress-stats">
                            {campaign.total_businesses_found} businesses found
                            {campaign.total_emails_found && campaign.total_emails_found > 0 &&
                              ` • ${campaign.total_emails_found} emails`
                            }
                          </div>
                        )}
                        <div className="auto-refresh-note">
                          Auto-refreshing every 30s
                        </div>
                      </div>
                    </div>
                  )}
                  {campaign.status === 'completed' && (
                    <>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleExportCSV(campaign.id, campaign.name)}
                      >
                        Export CSV
                      </button>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleExportToInstantly(campaign.id, campaign.name)}
                        disabled={!campaign.total_emails_found || campaign.total_emails_found === 0}
                        title={!campaign.total_emails_found || campaign.total_emails_found === 0 ? 'No emails to export' : 'Export to Instantly.ai'}
                      >
                        Export to Instantly
                      </button>
                      <button className="btn btn-secondary btn-sm">
                        View Details
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default GoogleMapsCampaigns;