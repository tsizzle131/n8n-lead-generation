import React, { useState, useEffect } from 'react';
import apiService from '../../services/api';
import ProductConfiguration from '../settings/ProductConfiguration';
import { ProductsList } from '../products/ProductsList';

interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string;
  status: 'active' | 'suspended' | 'trial' | 'cancelled';
  subscription_plan: 'free' | 'starter' | 'professional' | 'enterprise' | 'custom';
  contact_email?: string;
  created_at: string;
  trial_ends_at?: string;
  monthly_api_budget: number;
  total_contacts_processed: number;
  total_leads_generated: number;
  total_api_cost: number;
  campaign_count: number;
  active_campaigns: number;
  user_count: number;
  monthly_cost: number;
  trial_days_remaining?: number;
  product_name?: string;
  product_url?: string;
}

interface OrganizationsProps {
  showCreateForm?: boolean;
  onCreateFormShown?: () => void;
  productConfigOrgId?: string | null;
  onProductConfigShown?: () => void;
}

const Organizations: React.FC<OrganizationsProps> = ({
  showCreateForm: showCreateFormProp,
  onCreateFormShown,
  productConfigOrgId: productConfigOrgIdProp,
  onProductConfigShown
}) => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showProductConfig, setShowProductConfig] = useState(false);
  const [productConfigOrgId, setProductConfigOrgId] = useState<string | null>(null);
  const [showProductsModal, setShowProductsModal] = useState(false);
  const [productsOrgId, setProductsOrgId] = useState<string | null>(null);

  // Form states
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newOrg, setNewOrg] = useState({
    name: '',
    slug: '',
    description: '',
    contact_email: '',
    subscription_plan: 'free' as const
  });

  useEffect(() => {
    loadOrganizations();
    loadCurrentOrganization();
  }, []);

  // Handle prop to show create form
  useEffect(() => {
    if (showCreateFormProp) {
      setShowCreateForm(true);
      if (onCreateFormShown) {
        onCreateFormShown();
      }
    }
  }, [showCreateFormProp, onCreateFormShown]);

  // Handle prop to show product config
  useEffect(() => {
    if (productConfigOrgIdProp) {
      setProductConfigOrgId(productConfigOrgIdProp);
      setShowProductConfig(true);
      if (onProductConfigShown) {
        onProductConfigShown();
      }
    }
  }, [productConfigOrgIdProp, onProductConfigShown]);

  const loadOrganizations = async () => {
    try {
      setLoading(true);
      const response = await apiService.getOrganizations();
      setOrganizations(response.organizations || []);
    } catch (error: any) {
      showMessage('error', error.response?.data?.error || 'Failed to load organizations');
    } finally {
      setLoading(false);
    }
  };

  const loadCurrentOrganization = async () => {
    try {
      const response = await apiService.getCurrentOrganization();
      setCurrentOrgId(response.organizationId);
    } catch (error) {
      console.warn('Could not load current organization:', error);
    }
  };

  const createOrganization = async () => {
    if (!newOrg.name.trim() || !newOrg.slug.trim()) {
      showMessage('error', 'Organization name and slug are required');
      return;
    }

    try {
      setLoading(true);
      const response = await apiService.createOrganization(newOrg);
      showMessage('success', 'Organization created! Now configure your product...');
      setShowCreateForm(false);
      setNewOrg({ name: '', slug: '', description: '', contact_email: '', subscription_plan: 'free' });
      loadOrganizations();
      
      // Automatically open product configuration for the new organization
      if (response.organization && response.organization.id) {
        setTimeout(() => {
          setProductConfigOrgId(response.organization.id);
          setShowProductConfig(true);
        }, 500);
      }
    } catch (error: any) {
      showMessage('error', error.response?.data?.error || 'Failed to create organization');
    } finally {
      setLoading(false);
    }
  };

  const switchOrganization = async (orgId: string) => {
    try {
      setLoading(true);
      await apiService.setCurrentOrganization(orgId);
      setCurrentOrgId(orgId);
      showMessage('success', 'Organization switched successfully');
      
      // Refresh the page to load organization-specific data
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error: any) {
      showMessage('error', error.response?.data?.error || 'Failed to switch organization');
    } finally {
      setLoading(false);
    }
  };

  const updateOrganization = async (orgId: string, updates: Partial<Organization>) => {
    try {
      setLoading(true);
      await apiService.updateOrganization(orgId, updates);
      showMessage('success', 'Organization updated successfully');
      loadOrganizations();
    } catch (error: any) {
      showMessage('error', error.response?.data?.error || 'Failed to update organization');
    } finally {
      setLoading(false);
    }
  };

  const deleteOrganization = async (orgId: string) => {
    if (!window.confirm('Are you sure you want to delete this organization? This action cannot be undone and will delete ALL data associated with this organization.')) {
      return;
    }

    try {
      setLoading(true);
      await apiService.deleteOrganization(orgId);
      showMessage('success', 'Organization deleted successfully');
      loadOrganizations();
      
      // If we deleted the current organization, clear it
      if (currentOrgId === orgId) {
        setCurrentOrgId(null);
      }
    } catch (error: any) {
      showMessage('error', error.response?.data?.error || 'Failed to delete organization');
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
      case 'active': return '#10b981';
      case 'trial': return '#f59e0b';
      case 'suspended': return '#ef4444';
      case 'cancelled': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'free': return '#6b7280';
      case 'starter': return '#3b82f6';
      case 'professional': return '#8b5cf6';
      case 'enterprise': return '#10b981';
      case 'custom': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  };

  return (
    <div className="component-container">
      <h2>Organization Management</h2>
      <p className="component-description">
        Manage multiple organizations (clients) with isolated data, settings, and billing.
      </p>

      {message && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      {/* Current Organization Banner */}
      {currentOrgId && (
        <div className="current-org-banner">
          <h3>Current Organization</h3>
          <div className="current-org-info">
            {organizations.find(org => org.id === currentOrgId)?.name || 'Loading...'}
            <span className="current-org-note">All operations will be performed in the context of this organization</span>
          </div>
        </div>
      )}

      {/* Organization List */}
      <div className="organizations-section">
        <div className="section-header">
          <h3>Organizations</h3>
          <button
            onClick={() => setShowCreateForm(true)}
            className="btn btn-primary"
            disabled={loading}
          >
            + New Organization
          </button>
        </div>

        {loading && organizations.length === 0 ? (
          <div className="loading">Loading organizations...</div>
        ) : (
          <div className="organizations-grid">
            {organizations.map((org) => (
              <div
                key={org.id}
                className={`organization-card ${currentOrgId === org.id ? 'current' : ''}`}
              >
                <div className="org-header">
                  <div className="org-title">
                    <h4>{org.name}</h4>
                    <span className="org-slug">@{org.slug}</span>
                  </div>
                  <div className="org-badges">
                    <span 
                      className="status-badge"
                      style={{ backgroundColor: getStatusColor(org.status) }}
                    >
                      {org.status}
                    </span>
                    <span 
                      className="plan-badge"
                      style={{ backgroundColor: getPlanColor(org.subscription_plan) }}
                    >
                      {org.subscription_plan}
                    </span>
                  </div>
                </div>

                {org.description && (
                  <p className="org-description">{org.description}</p>
                )}
                
                {org.product_name && (
                  <div className="product-indicator">
                    <span className="product-badge">📦 {org.product_name}</span>
                  </div>
                )}

                <div className="org-stats">
                  <div className="stat">
                    <span className="stat-value">{org.campaign_count || 0}</span>
                    <span className="stat-label">Campaigns</span>
                  </div>
                  <div className="stat">
                    <span className="stat-value">{org.total_contacts_processed || 0}</span>
                    <span className="stat-label">Contacts</span>
                  </div>
                  <div className="stat">
                    <span className="stat-value">{org.total_leads_generated || 0}</span>
                    <span className="stat-label">Leads</span>
                  </div>
                  <div className="stat">
                    <span className="stat-value">${(org.monthly_cost || 0).toFixed(2)}</span>
                    <span className="stat-label">Monthly Cost</span>
                  </div>
                </div>

                {org.status === 'trial' && org.trial_days_remaining !== null && (
                  <div className="trial-warning">
                    <strong>Trial:</strong> {org.trial_days_remaining} days remaining
                  </div>
                )}

                <div className="org-actions">
                  {currentOrgId !== org.id && (
                    <button
                      onClick={() => switchOrganization(org.id)}
                      className="btn btn-primary btn-small"
                      disabled={loading}
                    >
                      Switch To
                    </button>
                  )}
                  {currentOrgId === org.id && (
                    <span className="current-indicator">Current</span>
                  )}
                  <button
                    onClick={() => {
                      setProductConfigOrgId(org.id);
                      setShowProductConfig(true);
                    }}
                    className="btn btn-info btn-small"
                    disabled={loading}
                  >
                    Product
                  </button>
                  <button
                    onClick={() => {
                      setProductsOrgId(org.id);
                      setShowProductsModal(true);
                    }}
                    className="btn btn-success btn-small"
                    disabled={loading}
                  >
                    📦 Products
                  </button>
                  <button
                    onClick={() => setSelectedOrg(org)}
                    className="btn btn-secondary btn-small"
                    disabled={loading}
                  >
                    Settings
                  </button>
                  <button
                    onClick={() => deleteOrganization(org.id)}
                    className="btn btn-danger btn-small"
                    disabled={loading || currentOrgId === org.id}
                  >
                    Delete
                  </button>
                </div>

                {org.contact_email && (
                  <div className="org-contact">
                    Contact: {org.contact_email}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Organization Modal */}
      {showCreateForm && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Create New Organization</h3>
            <div className="info-box">
              <strong>📦 Product Setup:</strong> After creating the organization, you'll be prompted to configure your product or service details for personalized messaging.
            </div>
            <div className="form-group">
              <label>Organization Name *</label>
              <input
                type="text"
                value={newOrg.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setNewOrg(prev => ({ 
                    ...prev, 
                    name,
                    slug: generateSlug(name)
                  }));
                }}
                className="form-control"
                placeholder="e.g., Acme Marketing Agency"
              />
            </div>
            <div className="form-group">
              <label>URL Slug *</label>
              <input
                type="text"
                value={newOrg.slug}
                onChange={(e) => setNewOrg(prev => ({ ...prev, slug: e.target.value }))}
                className="form-control"
                placeholder="acme-marketing"
              />
              <small>Used in URLs and must be unique</small>
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea
                value={newOrg.description}
                onChange={(e) => setNewOrg(prev => ({ ...prev, description: e.target.value }))}
                className="form-control"
                placeholder="Brief description of the organization"
                rows={3}
              />
            </div>
            <div className="form-group">
              <label>Contact Email</label>
              <input
                type="email"
                value={newOrg.contact_email}
                onChange={(e) => setNewOrg(prev => ({ ...prev, contact_email: e.target.value }))}
                className="form-control"
                placeholder="admin@acme-marketing.com"
              />
            </div>
            <div className="form-group">
              <label>Subscription Plan</label>
              <select
                value={newOrg.subscription_plan}
                onChange={(e) => setNewOrg(prev => ({ ...prev, subscription_plan: e.target.value as any }))}
                className="form-control"
              >
                <option value="free">Free</option>
                <option value="starter">Starter</option>
                <option value="professional">Professional</option>
                <option value="enterprise">Enterprise</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div className="modal-actions">
              <button
                onClick={createOrganization}
                className="btn btn-primary"
                disabled={loading}
              >
                Create Organization
              </button>
              <button
                onClick={() => setShowCreateForm(false)}
                className="btn btn-secondary"
                disabled={loading}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Organization Settings Modal */}
      {selectedOrg && (
        <div className="modal-overlay">
          <div className="modal large">
            <h3>Organization Settings: {selectedOrg.name}</h3>
            
            <div className="settings-tabs">
              <div className="settings-section">
                <h4>General Information</h4>
                <div className="settings-grid">
                  <div className="setting-item">
                    <label>Status</label>
                    <select
                      value={selectedOrg.status}
                      onChange={(e) => {
                        const newStatus = e.target.value as any;
                        updateOrganization(selectedOrg.id, { status: newStatus });
                        setSelectedOrg({ ...selectedOrg, status: newStatus });
                      }}
                      className="form-control"
                    >
                      <option value="active">Active</option>
                      <option value="trial">Trial</option>
                      <option value="suspended">Suspended</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                  <div className="setting-item">
                    <label>Subscription Plan</label>
                    <select
                      value={selectedOrg.subscription_plan}
                      onChange={(e) => {
                        const newPlan = e.target.value as any;
                        updateOrganization(selectedOrg.id, { subscription_plan: newPlan });
                        setSelectedOrg({ ...selectedOrg, subscription_plan: newPlan });
                      }}
                      className="form-control"
                    >
                      <option value="free">Free</option>
                      <option value="starter">Starter</option>
                      <option value="professional">Professional</option>
                      <option value="enterprise">Enterprise</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>
                  <div className="setting-item">
                    <label>Monthly API Budget ($)</label>
                    <input
                      type="number"
                      value={selectedOrg.monthly_api_budget}
                      onChange={(e) => {
                        const budget = parseFloat(e.target.value) || 0;
                        updateOrganization(selectedOrg.id, { monthly_api_budget: budget });
                        setSelectedOrg({ ...selectedOrg, monthly_api_budget: budget });
                      }}
                      className="form-control"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>

                <div className="stats-summary">
                  <h4>Organization Statistics</h4>
                  <div className="stats-grid">
                    <div className="stat-card">
                      <span className="stat-number">{selectedOrg.total_contacts_processed}</span>
                      <span className="stat-label">Total Contacts Processed</span>
                    </div>
                    <div className="stat-card">
                      <span className="stat-number">{selectedOrg.total_leads_generated}</span>
                      <span className="stat-label">Total Leads Generated</span>
                    </div>
                    <div className="stat-card">
                      <span className="stat-number">${selectedOrg.total_api_cost.toFixed(2)}</span>
                      <span className="stat-label">Total API Cost</span>
                    </div>
                    <div className="stat-card">
                      <span className="stat-number">{selectedOrg.user_count}</span>
                      <span className="stat-label">Users</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button
                onClick={() => setSelectedOrg(null)}
                className="btn btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Configuration Modal */}
      {showProductConfig && productConfigOrgId && (
        <div className="modal-overlay">
          <div className="modal large">
            <div className="modal-header">
              <h3>Product Configuration</h3>
              <button
                onClick={() => {
                  setShowProductConfig(false);
                  setProductConfigOrgId(null);
                }}
                className="close-btn"
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <ProductConfiguration
                organizationId={productConfigOrgId}
                isNewOrganization={organizations.find(org => org.id === productConfigOrgId)?.product_name === undefined}
                onSave={() => {
                  showMessage('success', 'Product configuration saved successfully');
                  loadOrganizations(); // Reload to show updated data
                }}
                onClose={() => {
                  setShowProductConfig(false);
                  setProductConfigOrgId(null);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Products Management Modal */}
      {showProductsModal && productsOrgId && (
        <div className="modal-overlay">
          <div className="modal large">
            <div className="modal-header-row">
              <h3>Manage Products</h3>
              <button
                onClick={() => {
                  setShowProductsModal(false);
                  setProductsOrgId(null);
                }}
                className="close-btn"
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <ProductsList organizationId={productsOrgId} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Organizations;