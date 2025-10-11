import React, { useState, useEffect, useRef } from 'react';
import apiService from '../../services/api';

interface Organization {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'suspended' | 'trial' | 'cancelled';
  subscription_plan: 'free' | 'starter' | 'professional' | 'enterprise' | 'custom';
  trial_days_remaining?: number;
}

interface OrganizationSelectorProps {
  onOrganizationChange?: (orgId: string | null) => void;
  onManageOrganizations?: () => void;
  onCreateOrganization?: () => void;
}

const OrganizationSelector: React.FC<OrganizationSelectorProps> = ({ onOrganizationChange, onManageOrganizations, onCreateOrganization }) => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadOrganizations();
    loadCurrentOrganization();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadOrganizations = async () => {
    try {
      const response = await apiService.getOrganizations();
      setOrganizations(response.organizations || []);
    } catch (error) {
      console.error('Failed to load organizations:', error);
    }
  };

  const loadCurrentOrganization = async () => {
    try {
      const response = await apiService.getCurrentOrganization();
      if (response.organizationId && response.organization) {
        setCurrentOrg(response.organization);
      }
    } catch (error) {
      console.warn('Could not load current organization:', error);
    }
  };

  const handleOrganizationSwitch = async (orgId: string) => {
    if (loading || currentOrg?.id === orgId) return;

    try {
      setLoading(true);
      await apiService.setCurrentOrganization(orgId);
      
      // Find and set the new current organization
      const newOrg = organizations.find(org => org.id === orgId);
      setCurrentOrg(newOrg || null);
      setIsOpen(false);
      
      // Notify parent component
      if (onOrganizationChange) {
        onOrganizationChange(orgId);
      }

      // Refresh the page to load organization-specific data
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error) {
      console.error('Failed to switch organization:', error);
    } finally {
      setLoading(false);
    }
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

  const getPlanBadgeColor = (plan: string) => {
    switch (plan) {
      case 'free': return '#6b7280';
      case 'starter': return '#3b82f6';
      case 'professional': return '#8b5cf6';
      case 'enterprise': return '#10b981';
      case 'custom': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  if (!currentOrg && organizations.length === 0) {
    return (
      <div className="org-selector-loading">
        <span>Loading organizations...</span>
      </div>
    );
  }

  return (
    <div className="organization-selector" ref={dropdownRef}>
      <button
        className={`org-selector-button ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading}
      >
        <div className="org-selector-current">
          {currentOrg ? (
            <>
              <div className="org-info">
                <span className="org-name">{currentOrg.name}</span>
                <div className="org-badges">
                  <span 
                    className="status-badge"
                    style={{ backgroundColor: getStatusColor(currentOrg.status) }}
                  >
                    {currentOrg.status}
                  </span>
                  {currentOrg.status === 'trial' && currentOrg.trial_days_remaining !== null && (
                    <span className="trial-badge">
                      {currentOrg.trial_days_remaining} days left
                    </span>
                  )}
                </div>
              </div>
            </>
          ) : (
            <span className="no-org">Select Organization</span>
          )}
          <svg 
            className={`dropdown-arrow ${isOpen ? 'rotated' : ''}`} 
            width="16" 
            height="16" 
            viewBox="0 0 16 16"
          >
            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="2" fill="none"/>
          </svg>
        </div>
      </button>

      {isOpen && (
        <div className="org-selector-dropdown">
          <div className="dropdown-header">
            <span>Switch Organization</span>
          </div>
          
          <div className="org-list">
            {organizations.map((org) => (
              <button
                key={org.id}
                className={`org-option ${currentOrg?.id === org.id ? 'current' : ''}`}
                onClick={() => handleOrganizationSwitch(org.id)}
                disabled={loading}
              >
                <div className="org-option-info">
                  <div className="org-option-header">
                    <span className="org-option-name">{org.name}</span>
                    {currentOrg?.id === org.id && (
                      <span className="current-indicator">Current</span>
                    )}
                  </div>
                  <div className="org-option-details">
                    <span className="org-slug">@{org.slug}</span>
                    <div className="org-option-badges">
                      <span 
                        className="status-badge small"
                        style={{ backgroundColor: getStatusColor(org.status) }}
                      >
                        {org.status}
                      </span>
                      <span 
                        className="plan-badge small"
                        style={{ backgroundColor: getPlanBadgeColor(org.subscription_plan) }}
                      >
                        {org.subscription_plan}
                      </span>
                    </div>
                  </div>
                  {org.status === 'trial' && org.trial_days_remaining !== null && (
                    <div className="trial-warning">
                      Trial: {org.trial_days_remaining} days remaining
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>

          <div className="dropdown-footer">
            <button 
              className="add-org-btn"
              onClick={() => {
                setIsOpen(false);
                if (onCreateOrganization) {
                  onCreateOrganization();
                }
              }}
              style={{ marginBottom: '8px' }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16">
                <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2"/>
              </svg>
              Add New Organization
            </button>
            <button 
              className="manage-orgs-btn"
              onClick={() => {
                setIsOpen(false);
                if (onManageOrganizations) {
                  onManageOrganizations();
                }
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16">
                <path d="M13.5 2.5l-11 11M6 2h7.5v7.5M14 10v4h-4" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
              Manage Organizations
            </button>
          </div>
        </div>
      )}

      {loading && (
        <div className="org-switching-overlay">
          <div className="switching-message">
            <div className="spinner"></div>
            <span>Switching organization...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrganizationSelector;