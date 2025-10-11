import React, { useState } from 'react';
import './App.css';
import Campaigns from './components/campaigns/Campaigns';
import GoogleMapsCampaigns from './components/campaigns/GoogleMapsCampaigns';
import Organizations from './components/organizations/Organizations';
import OrganizationSelector from './components/organizations/OrganizationSelector';
import Settings from './components/settings/Settings';

function App() {
  const [activeTab, setActiveTab] = useState('campaigns');
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(null);
  const [shouldCreateOrg, setShouldCreateOrg] = useState(false);

  // Streamlined tab structure - now with Google Maps campaigns
  const tabs = [
    { 
      id: 'campaigns', 
      label: 'Apollo Campaigns', 
      component: <Campaigns />,
      icon: '📧'
    },
    { 
      id: 'gmaps', 
      label: 'Local Business', 
      component: <GoogleMapsCampaigns />,
      icon: '📍'
    },
    { 
      id: 'organizations', 
      label: 'Organizations', 
      component: <Organizations showCreateForm={shouldCreateOrg} onCreateFormShown={() => setShouldCreateOrg(false)} />,
      icon: '🏢'
    },
    { 
      id: 'settings', 
      label: 'Settings', 
      component: <Settings />,
      icon: '⚙️'
    }
  ];

  // Handle organization changes
  const handleOrganizationChange = (orgId: string | null) => {
    setCurrentOrgId(orgId);
    // Additional logic for organization context can be added here
  };

  // Handle manage organizations button click
  const handleManageOrganizations = () => {
    setActiveTab('organizations');
  };

  // Handle create organization button click
  const handleCreateOrganization = () => {
    setActiveTab('organizations');
    setShouldCreateOrg(true);
  };

  // Get current component to render
  const getCurrentComponent = () => {
    const activeTabData = tabs.find(tab => tab.id === activeTab);
    return activeTabData?.component || <Campaigns />;
  };

  return (
    <div className="App">
      <header className="app-header">
        <div className="header-top">
          <h1>Lead Generation AI Assistant</h1>
          <div className="header-actions">
            <OrganizationSelector 
              onOrganizationChange={handleOrganizationChange}
              onManageOrganizations={handleManageOrganizations}
              onCreateOrganization={handleCreateOrganization}
            />
          </div>
        </div>
        
        <nav className="nav-tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="tab-icon">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </header>
      
      <main className="app-main">
        {getCurrentComponent()}
      </main>
    </div>
  );
}

export default App;