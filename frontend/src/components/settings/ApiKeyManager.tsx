import React, { useState, useEffect } from 'react';
import apiService, { APIKeys } from '../../services/api';

const ApiKeyManager: React.FC = () => {
  const [apiKeys, setApiKeys] = useState<APIKeys>({
    openai_api_key: '',
    apify_api_key: '',
    bouncer_api_key: '',
    linkedin_actor_id: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    const fetchApiKeys = async () => {
      try {
        const keys = await apiService.getApiKeys();
        setApiKeys(keys);
      } catch (error) {
        showMessage('error', 'Failed to load API keys');
      }
    };
    fetchApiKeys();
  }, []);

  const loadApiKeys = async () => {
    try {
      const keys = await apiService.getApiKeys();
      setApiKeys(keys);
    } catch (error) {
      showMessage('error', 'Failed to load API keys');
    }
  };

  const handleInputChange = (key: keyof APIKeys, value: string) => {
    setApiKeys(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Only send keys that aren't masked (contain actual values)
      const keysToSave: any = {};

      if (apiKeys.openai_api_key && !apiKeys.openai_api_key.includes('*')) {
        keysToSave.openai_api_key = apiKeys.openai_api_key;
      }

      if (apiKeys.apify_api_key && !apiKeys.apify_api_key.includes('*')) {
        keysToSave.apify_api_key = apiKeys.apify_api_key;
      }

      if (apiKeys.bouncer_api_key && !apiKeys.bouncer_api_key.includes('*')) {
        keysToSave.bouncer_api_key = apiKeys.bouncer_api_key;
      }

      // LinkedIn actor ID is not sensitive, always save it
      if (apiKeys.linkedin_actor_id !== undefined) {
        keysToSave.linkedin_actor_id = apiKeys.linkedin_actor_id;
      }

      // Only save if we have real keys to save
      if (Object.keys(keysToSave).length > 0) {
        await apiService.updateApiKeys(keysToSave);
        showMessage('success', 'API keys saved successfully');
      } else {
        showMessage('error', 'Please enter valid API keys (not masked values)');
      }
    } catch (error) {
      showMessage('error', 'Failed to save API keys');
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    if (!apiKeys.openai_api_key) {
      showMessage('error', 'Please enter an OpenAI API key first');
      return;
    }

    setTesting(true);
    try {
      // Save keys first (only non-masked ones)
      const keysToSave: any = {};
      if (apiKeys.openai_api_key && !apiKeys.openai_api_key.includes('*')) {
        keysToSave.openai_api_key = apiKeys.openai_api_key;
      }
      if (apiKeys.apify_api_key && !apiKeys.apify_api_key.includes('*')) {
        keysToSave.apify_api_key = apiKeys.apify_api_key;
      }
      
      if (Object.keys(keysToSave).length > 0) {
        await apiService.updateApiKeys(keysToSave);
      }
      
      // Then test connection
      const result = await apiService.testConnection();
      showMessage(result.status as 'success' | 'error', result.message);
    } catch (error) {
      showMessage('error', 'Connection test failed');
    } finally {
      setTesting(false);
    }
  };


  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  return (
    <div className="component-container">
      <h2>API Key Management</h2>
      <p className="component-description">
        Configure your API keys to enable AI-powered icebreaker generation, lead scraping, LinkedIn enrichment, and email verification.
      </p>

      {message && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="form-group">
        <label htmlFor="openai-key">OpenAI API Key *</label>
        <input
          id="openai-key"
          type="password"
          placeholder={apiKeys.openai_api_key?.includes('*') ? 'Key is saved (enter new key to change)' : 'sk-...'}
          value={apiKeys.openai_api_key || ''}
          onChange={(e) => handleInputChange('openai_api_key', e.target.value)}
          className="api-key-input"
        />
        <small>
          {apiKeys.openai_api_key?.includes('*') 
            ? '✅ API key is saved and working. Enter a new key to replace it.' 
            : 'Required for generating icebreakers using GPT models'
          }
        </small>
      </div>

      <div className="form-group">
        <label htmlFor="apify-key">Apify API Key</label>
        <input
          id="apify-key"
          type="password"
          placeholder={apiKeys.apify_api_key?.includes('*') ? 'Key is saved (enter new key to change)' : 'apify_api_...'}
          value={apiKeys.apify_api_key || ''}
          onChange={(e) => handleInputChange('apify_api_key', e.target.value)}
          className="api-key-input"
        />
        <small>
          {apiKeys.apify_api_key?.includes('*')
            ? '✅ API key is saved. Enter a new key to replace it.'
            : 'Required for Google Maps and Facebook scraping'
          }
        </small>
      </div>

      <div className="form-group">
        <label htmlFor="bouncer-key">Bouncer API Key</label>
        <input
          id="bouncer-key"
          type="password"
          placeholder={apiKeys.bouncer_api_key?.includes('*') ? 'Key is saved (enter new key to change)' : 'Enter Bouncer API key'}
          value={apiKeys.bouncer_api_key || ''}
          onChange={(e) => handleInputChange('bouncer_api_key', e.target.value)}
          className="api-key-input"
        />
        <small>
          {apiKeys.bouncer_api_key?.includes('*')
            ? '✅ API key is saved. Enter a new key to replace it.'
            : 'Optional: Used for email verification (verify deliverability)'
          }
        </small>
      </div>

      <div className="form-group">
        <label htmlFor="linkedin-actor">LinkedIn Actor ID (Optional)</label>
        <input
          id="linkedin-actor"
          type="text"
          placeholder="bebity~linkedin-premium-actor"
          value={apiKeys.linkedin_actor_id || ''}
          onChange={(e) => handleInputChange('linkedin_actor_id', e.target.value)}
          className="api-key-input"
        />
        <small>
          Apify actor ID for LinkedIn scraping. Leave default unless using a custom actor.
        </small>
      </div>

      <div className="button-group">
        <button 
          onClick={handleSave}
          disabled={loading}
          className="btn btn-primary"
        >
          {loading ? 'Saving...' : 'Save API Keys'}
        </button>
        
        <button 
          onClick={handleTestConnection}
          disabled={testing || !apiKeys.openai_api_key}
          className="btn btn-secondary"
        >
          {testing ? 'Testing...' : 'Test OpenAI Connection'}
        </button>
      </div>

      <div className="api-key-info">
        <h3>Getting Your API Keys</h3>
        <div className="info-section">
          <h4>OpenAI API Key</h4>
          <p>
            1. Go to <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer">OpenAI API Keys</a><br/>
            2. Click "Create new secret key"<br/>
            3. Copy and paste the key above
          </p>
        </div>
        
        <div className="info-section">
          <h4>Apify API Key</h4>
          <p>
            1. Go to <a href="https://console.apify.com/account/integrations" target="_blank" rel="noopener noreferrer">Apify Integrations</a><br/>
            2. Copy your API token<br/>
            3. Paste it above
          </p>
        </div>

        <div className="info-section">
          <h4>Bouncer API Key (Optional)</h4>
          <p>
            1. Go to <a href="https://app.usebouncer.com/settings/api" target="_blank" rel="noopener noreferrer">Bouncer API Settings</a><br/>
            2. Copy your API key<br/>
            3. Paste it above<br/>
            <br/>
            <strong>What it does:</strong> Verifies email deliverability and protects sender reputation by validating emails before use.
          </p>
        </div>

        <div className="info-section">
          <h4>LinkedIn Actor ID (Optional)</h4>
          <p>
            Default value works for most users. Only change if:<br/>
            - You have a custom LinkedIn scraping actor on Apify<br/>
            - You want to use a different LinkedIn scraper<br/>
            <br/>
            Default: <code>bebity~linkedin-premium-actor</code>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyManager;