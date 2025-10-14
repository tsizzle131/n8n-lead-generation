import React, { useState, useEffect } from 'react';
import apiService, { APIKeys, Settings as SettingsType } from '../../services/api';

interface SupabaseSettings {
  url: string;
  key: string;
}

interface CombinedSettings {
  apiKeys: APIKeys;
  aiSettings: SettingsType;
  supabase: SupabaseSettings;
}

const Settings: React.FC = () => {
  const [activeSection, setActiveSection] = useState<'api' | 'ai' | 'database'>('api');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // API Keys state
  const [apiKeys, setApiKeys] = useState<APIKeys>({
    openai_api_key: '',
    apify_api_key: '',
    vapi_api_key: '',
    bouncer_api_key: '',
    instantly_api_key: '',
    linkedin_actor_id: ''
  });
  const [apiKeysStatus, setApiKeysStatus] = useState<{ openai: boolean; apify: boolean; vapi: boolean; bouncer: boolean; instantly: boolean; linkedin: boolean }>({
    openai: false,
    apify: false,
    vapi: false,
    bouncer: false,
    instantly: false,
    linkedin: false
  });
  
  // AI Settings state
  const [aiSettings, setAiSettings] = useState<SettingsType>({
    ai_model_summary: 'gpt-4o-mini',
    ai_model_icebreaker: 'gpt-4o',
    ai_temperature: 0.5,
    delay_between_ai_calls: 45
  });
  
  // Database settings state
  const [supabase, setSupabase] = useState<SupabaseSettings>({
    url: '',
    key: ''
  });

  useEffect(() => {
    loadAllSettings();
  }, []);

  const loadAllSettings = async () => {
    try {
      // Load API keys
      const keys = await apiService.getApiKeys();
      setApiKeys(keys);
      checkApiKeyStatuses(keys);
      
      // Load AI settings
      const ai = await apiService.getSettings();
      setAiSettings(ai);
      
      // Load database settings
      const db = await apiService.getSupabaseSettings();
      setSupabase(db);
    } catch (error) {
      showMessage('error', 'Failed to load settings');
    }
  };

  const checkApiKeyStatuses = (keys: APIKeys) => {
    setApiKeysStatus({
      openai: !!keys.openai_api_key && keys.openai_api_key.length > 10,
      apify: !!keys.apify_api_key && keys.apify_api_key.length > 10,
      vapi: !!keys.vapi_api_key && keys.vapi_api_key.length > 10,
      bouncer: !!keys.bouncer_api_key && keys.bouncer_api_key.length > 10,
      instantly: !!keys.instantly_api_key && keys.instantly_api_key.length > 10,
      linkedin: !!keys.linkedin_actor_id && keys.linkedin_actor_id.length > 5
    });
  };

  const handleApiKeyChange = (key: keyof APIKeys, value: string) => {
    setApiKeys(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleAiSettingChange = (key: keyof SettingsType, value: string | number) => {
    setAiSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSupabaseChange = (key: keyof SupabaseSettings, value: string) => {
    setSupabase(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const saveApiKeys = async () => {
    setLoading(true);
    try {
      await apiService.updateApiKeys(apiKeys);
      checkApiKeyStatuses(apiKeys);
      showMessage('success', 'API keys saved successfully');
    } catch (error) {
      showMessage('error', 'Failed to save API keys');
    } finally {
      setLoading(false);
    }
  };

  const saveAiSettings = async () => {
    setLoading(true);
    try {
      await apiService.updateSettings(aiSettings);
      showMessage('success', 'AI settings saved successfully');
    } catch (error) {
      showMessage('error', 'Failed to save AI settings');
    } finally {
      setLoading(false);
    }
  };

  const saveDatabase = async () => {
    setLoading(true);
    try {
      await apiService.updateSupabaseSettings(supabase);
      showMessage('success', 'Database settings saved successfully');
    } catch (error) {
      showMessage('error', 'Failed to save database settings');
    } finally {
      setLoading(false);
    }
  };

  const testOpenAI = async () => {
    setLoading(true);
    try {
      await apiService.testConnection();
      showMessage('success', 'OpenAI connection successful!');
    } catch (error) {
      showMessage('error', 'OpenAI connection failed. Check your API key.');
    } finally {
      setLoading(false);
    }
  };

  const testDatabase = async () => {
    setLoading(true);
    try {
      const result = await apiService.testSupabaseConnection();
      showMessage('success', 'Database connection successful!');
    } catch (error) {
      showMessage('error', 'Database connection failed. Check your settings.');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const modelOptions = [
    { value: 'gpt-4o', label: 'GPT-4o (Most Capable)', cost: 'Higher cost' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Balanced)', cost: 'Lower cost' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo (Previous Gen)', cost: 'Higher cost' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo (Fastest)', cost: 'Lowest cost' }
  ];

  return (
    <div className="component-container">
      <h2>Settings & Configuration</h2>
      <p className="component-description">
        Configure API keys, AI models, and database connections for your lead generation system.
      </p>

      {message && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      {/* Section Navigation */}
      <div className="settings-nav">
        <button 
          className={`settings-nav-btn ${activeSection === 'api' ? 'active' : ''}`}
          onClick={() => setActiveSection('api')}
        >
          🔑 API Keys
        </button>
        <button 
          className={`settings-nav-btn ${activeSection === 'ai' ? 'active' : ''}`}
          onClick={() => setActiveSection('ai')}
        >
          🤖 AI Configuration
        </button>
        <button 
          className={`settings-nav-btn ${activeSection === 'database' ? 'active' : ''}`}
          onClick={() => setActiveSection('database')}
        >
          💾 Database
        </button>
      </div>

      {/* API Keys Section */}
      {activeSection === 'api' && (
        <div className="settings-content">
          <h3>API Key Management</h3>
          <p className="section-description">
            Configure your API keys to enable AI-powered icebreaker generation and lead scraping.
          </p>

          <div className="form-group">
            <label htmlFor="openai-key">OpenAI API Key *</label>
            <input
              id="openai-key"
              type="password"
              value={apiKeys.openai_api_key}
              onChange={(e) => handleApiKeyChange('openai_api_key', e.target.value)}
              placeholder={apiKeysStatus.openai ? "••••••••••••••••" : "sk-..."}
            />
            {apiKeysStatus.openai && (
              <small className="success-text">✅ API key is saved and working. Enter a new key to replace it.</small>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="apify-key">Apify API Key (Optional)</label>
            <input
              id="apify-key"
              type="password"
              value={apiKeys.apify_api_key}
              onChange={(e) => handleApiKeyChange('apify_api_key', e.target.value)}
              placeholder={apiKeysStatus.apify ? "••••••••••••••••" : "apify_api_..."}
            />
            {apiKeysStatus.apify && (
              <small className="success-text">✅ API key is saved. Enter a new key to replace it.</small>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="bouncer-key">Bouncer API Key (Optional)</label>
            <input
              id="bouncer-key"
              type="password"
              value={apiKeys.bouncer_api_key || ''}
              onChange={(e) => handleApiKeyChange('bouncer_api_key', e.target.value)}
              placeholder={apiKeysStatus.bouncer ? "••••••••••••••••" : "Enter Bouncer API key"}
            />
            {apiKeysStatus.bouncer ? (
              <small className="success-text">✅ API key is saved. Enter a new key to replace it.</small>
            ) : (
              <small>Optional: Used for email verification (verify deliverability)</small>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="instantly-key">Instantly.ai API Key</label>
            <input
              id="instantly-key"
              type="password"
              value={apiKeys.instantly_api_key || ''}
              onChange={(e) => handleApiKeyChange('instantly_api_key', e.target.value)}
              placeholder={apiKeysStatus.instantly ? "••••••••••••••••" : "Enter Instantly.ai API key"}
            />
            {apiKeysStatus.instantly ? (
              <small className="success-text">✅ API key is saved. Enter a new key to replace it.</small>
            ) : (
              <small>Required for exporting campaigns to Instantly.ai for email automation</small>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="linkedin-actor">LinkedIn Actor ID (Optional)</label>
            <input
              id="linkedin-actor"
              type="text"
              value={apiKeys.linkedin_actor_id || ''}
              onChange={(e) => handleApiKeyChange('linkedin_actor_id', e.target.value)}
              placeholder="bebity~linkedin-premium-actor"
            />
            {apiKeysStatus.linkedin ? (
              <small className="success-text">✅ LinkedIn Actor ID is configured.</small>
            ) : (
              <small>Apify actor ID for LinkedIn scraping. Leave default unless using a custom actor.</small>
            )}
          </div>

          <div className="button-group">
            <button 
              onClick={saveApiKeys}
              disabled={loading}
              className="btn btn-primary"
            >
              {loading ? 'Saving...' : 'Save API Keys'}
            </button>
            <button 
              onClick={testOpenAI}
              disabled={loading || !apiKeysStatus.openai}
              className="btn btn-secondary"
            >
              Test OpenAI Connection
            </button>
          </div>

          <div className="info-section">
            <h4>Getting Your API Keys</h4>
            <div className="info-item">
              <h5>OpenAI API Key</h5>
              <ol>
                <li>Go to <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer">OpenAI API Keys</a></li>
                <li>Click "Create new secret key"</li>
                <li>Copy and paste the key above</li>
              </ol>
            </div>
            <div className="info-item">
              <h5>Apify API Key (Optional)</h5>
              <ol>
                <li>Go to <a href="https://console.apify.com/account/integrations" target="_blank" rel="noopener noreferrer">Apify Integrations</a></li>
                <li>Copy your API token</li>
                <li>Paste it above</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* AI Configuration Section */}
      {activeSection === 'ai' && (
        <div className="settings-content">
          <h3>AI Configuration</h3>
          <p className="section-description">
            Configure AI models, creativity settings, and rate limiting for optimal performance.
          </p>

          <div className="settings-section">
            <h4>AI Models</h4>
            
            <div className="form-group">
              <label>Summary Model</label>
              <select
                value={aiSettings.ai_model_summary}
                onChange={(e) => handleAiSettingChange('ai_model_summary', e.target.value)}
              >
                {modelOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label} - {option.cost}
                  </option>
                ))}
              </select>
              <small>Model used for summarizing website content</small>
            </div>

            <div className="form-group">
              <label>Icebreaker Model</label>
              <select
                value={aiSettings.ai_model_icebreaker}
                onChange={(e) => handleAiSettingChange('ai_model_icebreaker', e.target.value)}
              >
                {modelOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label} - {option.cost}
                  </option>
                ))}
              </select>
              <small>Model used for generating personalized icebreakers</small>
            </div>
          </div>

          <div className="settings-section">
            <h4>Generation Parameters</h4>
            
            <div className="form-group">
              <label>AI Temperature: {aiSettings.ai_temperature}</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={aiSettings.ai_temperature}
                onChange={(e) => handleAiSettingChange('ai_temperature', parseFloat(e.target.value))}
                className="slider"
              />
              <div className="slider-labels">
                <span>More Focused (0.0)</span>
                <span>More Creative (1.0)</span>
              </div>
              <small>Lower values give more consistent responses. Higher values give more creative responses.</small>
            </div>

            <div className="form-group">
              <label>Delay Between AI Calls (seconds)</label>
              <input
                type="number"
                min="1"
                max="300"
                value={aiSettings.delay_between_ai_calls}
                onChange={(e) => handleAiSettingChange('delay_between_ai_calls', parseInt(e.target.value))}
              />
              <small>Wait time between API calls. Recommended: 45s for production, 5s for testing.</small>
            </div>
          </div>

          <div className="button-group">
            <button 
              onClick={saveAiSettings}
              disabled={loading}
              className="btn btn-primary"
            >
              {loading ? 'Saving...' : 'Save AI Settings'}
            </button>
          </div>

          <div className="settings-tips">
            <h4>Optimization Tips</h4>
            <ul>
              <li><strong>For Testing:</strong> Use GPT-4o-mini with temperature 0.3 and 5s delays</li>
              <li><strong>For Production:</strong> Use GPT-4o for icebreakers, GPT-4o-mini for summaries, 45s delays</li>
              <li><strong>Budget Conscious:</strong> Use GPT-3.5-turbo for both, but expect lower quality</li>
            </ul>
          </div>
        </div>
      )}

      {/* Database Section */}
      {activeSection === 'database' && (
        <div className="settings-content">
          <h3>Database Configuration</h3>
          <p className="section-description">
            Configure your Supabase database connection for storing leads and campaigns.
          </p>

          <div className="form-group">
            <label htmlFor="supabase-url">Supabase Project URL</label>
            <input
              id="supabase-url"
              type="text"
              value={supabase.url}
              onChange={(e) => handleSupabaseChange('url', e.target.value)}
              placeholder="https://your-project.supabase.co"
            />
            <small>Found in your Supabase project settings</small>
          </div>

          <div className="form-group">
            <label htmlFor="supabase-key">Supabase API Key</label>
            <input
              id="supabase-key"
              type="password"
              value={supabase.key}
              onChange={(e) => handleSupabaseChange('key', e.target.value)}
              placeholder="eyJhbGc..."
            />
            <small>Use the anon/public key from your Supabase project</small>
          </div>

          <div className="button-group">
            <button 
              onClick={saveDatabase}
              disabled={loading}
              className="btn btn-primary"
            >
              {loading ? 'Saving...' : 'Save Database Settings'}
            </button>
            <button 
              onClick={testDatabase}
              disabled={loading || !supabase.url || !supabase.key}
              className="btn btn-secondary"
            >
              Test Connection
            </button>
          </div>

          <div className="info-section">
            <h4>Database Features</h4>
            <ul>
              <li>✅ Automatic data synchronization</li>
              <li>✅ Multi-organization support</li>
              <li>✅ Real-time updates</li>
              <li>✅ Secure data storage</li>
              <li>✅ Automatic backups</li>
            </ul>
          </div>

          <div className="info-section">
            <h4>Getting Your Supabase Credentials</h4>
            <ol>
              <li>Go to <a href="https://app.supabase.io" target="_blank" rel="noopener noreferrer">Supabase Dashboard</a></li>
              <li>Select your project</li>
              <li>Go to Settings → API</li>
              <li>Copy the Project URL and anon/public key</li>
              <li>Paste them above</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;