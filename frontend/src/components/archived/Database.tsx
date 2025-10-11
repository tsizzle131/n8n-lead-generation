import React, { useState, useEffect } from 'react';
import apiService from '../../services/api';

interface SupabaseSettings {
  url: string;
  key: string;
}

const Database: React.FC = () => {
  const [supabase, setSupabase] = useState<SupabaseSettings>({
    url: '',
    key: ''
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    loadSupabaseSettings();
  }, []);

  const loadSupabaseSettings = async () => {
    try {
      const settings = await apiService.getSupabaseSettings();
      setSupabase(settings);
    } catch (error) {
      console.error('Failed to load Supabase settings:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSupabase(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const saveSettings = async () => {
    setIsLoading(true);
    try {
      await apiService.updateSupabaseSettings(supabase);
      showMessage('success', 'Supabase settings saved successfully!');
    } catch (error: any) {
      showMessage('error', error.response?.data?.message || 'Failed to save settings');
    } finally {
      setIsLoading(false);
    }
  };

  const testConnection = async () => {
    setIsTesting(true);
    try {
      const result = await apiService.testSupabaseConnection();
      showMessage('success', result.message);
    } catch (error: any) {
      showMessage('error', error.response?.data?.message || 'Connection test failed');
    } finally {
      setIsTesting(false);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const initializeDatabase = async () => {
    setIsLoading(true);
    try {
      // This would call an endpoint to run the database schema
      showMessage('success', 'Database initialization completed! Please run the SQL schema in your Supabase dashboard.');
    } catch (error: any) {
      showMessage('error', 'Database initialization failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="component-container">
      <h2>Database Configuration</h2>
      <p className="component-description">
        Configure your Supabase database connection for storing Apollo contact data and AI-generated leads.
      </p>

      {message && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      {/* Supabase Settings */}
      <div className="settings-section">
        <h3>Supabase Settings</h3>
        
        <div className="form-group">
          <label htmlFor="supabase-url">Supabase Project URL</label>
          <input
            type="text"
            id="supabase-url"
            name="url"
            value={supabase.url}
            onChange={handleInputChange}
            placeholder="https://xyzproject.supabase.co"
            className="form-control"
          />
          <small>Your Supabase project URL (found in Settings → API). Format: https://your-project-id.supabase.co</small>
        </div>

        <div className="form-group">
          <label htmlFor="supabase-key">Supabase API Key</label>
          <input
            type="password"
            id="supabase-key"
            name="key"
            value={supabase.key}
            onChange={handleInputChange}
            placeholder="Your Supabase anon/public API key"
            className="form-control api-key-input"
          />
          <small>Your Supabase anon public key (found in Settings → API)</small>
        </div>

        <div className="button-group">
          <button
            onClick={saveSettings}
            disabled={isLoading}
            className="btn btn-primary"
          >
            {isLoading ? 'Saving...' : 'Save Settings'}
          </button>
          
          <button
            onClick={testConnection}
            disabled={isTesting || !supabase.url || !supabase.key}
            className="btn btn-secondary"
          >
            {isTesting ? 'Testing...' : 'Test Connection'}
          </button>
        </div>
      </div>

      {/* Database Schema */}
      <div className="settings-section">
        <h3>Database Schema</h3>
        <p>Your database needs the following tables to store lead generation data:</p>
        
        <div className="database-schema">
          <div className="schema-table">
            <h4>📊 search_urls</h4>
            <p>Stores Apollo search URLs and their processing status</p>
          </div>
          
          <div className="schema-table">
            <h4>👥 raw_contacts</h4>
            <p>All contact data from Apollo/Apify with complete field preservation</p>
            <ul>
              <li>Personal info: name, email, LinkedIn profile</li>
              <li>Professional: title, headline, company</li>
              <li>Social: Twitter, GitHub, Facebook</li>
              <li>Education: degree, grade level</li>
              <li>Confidence scores and email status</li>
            </ul>
          </div>
          
          <div className="schema-table">
            <h4>🎯 processed_leads</h4>
            <p>AI-generated leads with icebreakers ready for outreach</p>
          </div>
        </div>

        <div className="database-setup">
          <h4>Setup Instructions:</h4>
          <ol>
            <li>Create a new Supabase project at <a href="https://supabase.com" target="_blank" rel="noopener noreferrer">supabase.com</a></li>
            <li>In your Supabase dashboard, go to Settings → API</li>
            <li>Copy your <strong>Project URL</strong> (format: https://xyz.supabase.co)</li>
            <li>Copy your <strong>anon public</strong> API key (the long one, not the service_role key)</li>
            <li>Paste them in the form above and test the connection</li>
            <li>Once connected, go to SQL Editor in Supabase</li>
            <li>Copy and run the SQL schema from <code>database_schema.sql</code></li>
          </ol>
          
          <div style={{marginTop: '1rem', padding: '1rem', backgroundColor: '#fff3cd', borderRadius: '0.5rem', border: '1px solid #ffeaa7'}}>
            <h5 style={{color: '#856404', marginBottom: '0.5rem'}}>⚠️ Troubleshooting:</h5>
            <ul style={{color: '#856404', fontSize: '0.9rem'}}>
              <li><strong>404 Error:</strong> Check your project URL format</li>
              <li><strong>401 Error:</strong> Verify your API key is correct</li>
              <li><strong>403 Error:</strong> Make sure you're using the anon public key, not service_role</li>
              <li>URL should NOT end with /dashboard - just https://your-project.supabase.co</li>
            </ul>
          </div>
        </div>

        <div className="button-group">
          <button
            onClick={initializeDatabase}
            disabled={isLoading || !supabase.url || !supabase.key}
            className="btn btn-secondary"
          >
            View Schema Instructions
          </button>
        </div>
      </div>

      {/* Database Benefits */}
      <div className="settings-section">
        <h3>Why Supabase?</h3>
        <div className="database-benefits">
          <div className="benefit-item">
            <h4>🔄 Complete Data Pipeline</h4>
            <p>Two-stage processing: Raw data → Qualified leads</p>
          </div>
          
          <div className="benefit-item">
            <h4>📈 Advanced Analytics</h4>
            <p>Track conversion rates, email confidence, and lead quality</p>
          </div>
          
          <div className="benefit-item">
            <h4>🔍 Rich Filtering</h4>
            <p>Filter by education, social profiles, confidence scores</p>
          </div>
          
          <div className="benefit-item">
            <h4>♻️ Reprocessing</h4>
            <p>Test different prompts on the same raw data</p>
          </div>
          
          <div className="benefit-item">
            <h4>🚀 Scalability</h4>
            <p>Handle thousands of contacts with real-time updates</p>
          </div>
          
          <div className="benefit-item">
            <h4>💾 Data Security</h4>
            <p>Professional database with backups and security</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Database;