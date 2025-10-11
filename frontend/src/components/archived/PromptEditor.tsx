import React, { useState, useEffect } from 'react';
import apiService, { Prompts } from '../../services/api';

const PromptEditor: React.FC = () => {
  const [prompts, setPrompts] = useState<Prompts>({
    summary: '',
    icebreaker: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'summary' | 'icebreaker'>('icebreaker');

  useEffect(() => {
    const fetchPrompts = async () => {
      try {
        const loadedPrompts = await apiService.getPrompts();
        setPrompts(loadedPrompts);
      } catch (error) {
        showMessage('error', 'Failed to load prompts');
      }
    };
    fetchPrompts();
  }, []);

  const loadPrompts = async () => {
    try {
      const loadedPrompts = await apiService.getPrompts();
      setPrompts(loadedPrompts);
    } catch (error) {
      showMessage('error', 'Failed to load prompts');
    }
  };

  const handlePromptChange = (promptType: 'summary' | 'icebreaker', value: string) => {
    setPrompts(prev => ({
      ...prev,
      [promptType]: value
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await apiService.updatePrompts(prompts);
      showMessage('success', 'Prompts saved successfully');
    } catch (error) {
      showMessage('error', 'Failed to save prompts');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    loadPrompts();
    showMessage('success', 'Prompts reset to last saved version');
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const exportPrompts = () => {
    const dataStr = JSON.stringify(prompts, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'prompts.json';
    link.click();
    URL.revokeObjectURL(url);
    showMessage('success', 'Prompts exported successfully');
  };

  const importPrompts = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string);
        if (imported.summary && imported.icebreaker) {
          setPrompts(imported);
          showMessage('success', 'Prompts imported successfully');
        } else {
          showMessage('error', 'Invalid prompt file format');
        }
      } catch (error) {
        showMessage('error', 'Failed to parse imported file');
      }
    };
    reader.readAsText(file);
    
    // Reset input
    event.target.value = '';
  };

  return (
    <div className="component-container">
      <h2>Prompt Editor</h2>
      <p className="component-description">
        Customize the AI prompts used for website summarization and icebreaker generation.
        Changes will apply to all future generations.
      </p>

      {message && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="prompt-tabs">
        <button
          className={`tab ${activeTab === 'icebreaker' ? 'active' : ''}`}
          onClick={() => setActiveTab('icebreaker')}
        >
          Icebreaker Prompt
        </button>
        <button
          className={`tab ${activeTab === 'summary' ? 'active' : ''}`}
          onClick={() => setActiveTab('summary')}
        >
          Summary Prompt
        </button>
      </div>

      <div className="prompt-editor">
        {activeTab === 'icebreaker' && (
          <div className="prompt-section">
            <h3>Icebreaker Generation Prompt</h3>
            <p className="prompt-description">
              This prompt generates personalized cold email icebreakers based on contact info and website summaries.
            </p>
            <textarea
              value={prompts.icebreaker}
              onChange={(e) => handlePromptChange('icebreaker', e.target.value)}
              className="prompt-textarea"
              placeholder="Enter your icebreaker generation prompt..."
              rows={15}
            />
            <div className="prompt-tips">
              <h4>Tips for Icebreaker Prompts:</h4>
              <ul>
                <li>Use variables like {"{name}"}, {"{company}"} for personalization</li>
                <li>Include instructions about tone and style</li>
                <li>Specify the desired output format (JSON recommended)</li>
                <li>Provide examples of good icebreakers</li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'summary' && (
          <div className="prompt-section">
            <h3>Website Summary Prompt</h3>
            <p className="prompt-description">
              This prompt creates concise summaries of scraped website content that will be used for icebreaker generation.
            </p>
            <textarea
              value={prompts.summary}
              onChange={(e) => handlePromptChange('summary', e.target.value)}
              className="prompt-textarea"
              placeholder="Enter your website summary prompt..."
              rows={15}
            />
            <div className="prompt-tips">
              <h4>Tips for Summary Prompts:</h4>
              <ul>
                <li>Focus on extracting business-relevant information</li>
                <li>Keep summaries concise but comprehensive</li>
                <li>Identify unique selling points and company focus</li>
                <li>Specify JSON output format for consistency</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      <div className="button-group">
        <button 
          onClick={handleSave}
          disabled={loading}
          className="btn btn-primary"
        >
          {loading ? 'Saving...' : 'Save Prompts'}
        </button>
        
        <button 
          onClick={handleReset}
          className="btn btn-secondary"
        >
          Reset to Saved
        </button>

        <button 
          onClick={exportPrompts}
          className="btn btn-secondary"
        >
          Export Prompts
        </button>

        <label className="btn btn-secondary file-input-label">
          Import Prompts
          <input 
            type="file" 
            accept=".json"
            onChange={importPrompts}
            className="file-input"
          />
        </label>
      </div>

      <div className="character-count">
        <p>
          Icebreaker prompt: {prompts.icebreaker.length} characters | 
          Summary prompt: {prompts.summary.length} characters
        </p>
      </div>
    </div>
  );
};

export default PromptEditor;