import React, { useState, useEffect } from 'react';
import apiService, { ContactData, TestRequest } from '../../services/api';

const ContactTester: React.FC = () => {
  const [contact, setContact] = useState<ContactData>({
    first_name: '',
    last_name: '',
    headline: '',
    location: '',
    website_summaries: []
  });
  
  const [sampleContacts, setSampleContacts] = useState<ContactData[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const fetchSampleData = async () => {
      try {
        const data = await apiService.getSampleData();
        setSampleContacts(data.contacts);
        if (data.contacts.length > 0) {
          setContact(data.contacts[0]);
        }
      } catch (error) {
        showMessage('error', 'Failed to load sample data');
      }
    };
    fetchSampleData();
  }, []);

  const loadSampleData = async () => {
    try {
      const data = await apiService.getSampleData();
      setSampleContacts(data.contacts);
      if (data.contacts.length > 0) {
        setContact(data.contacts[0]);
      }
    } catch (error) {
      showMessage('error', 'Failed to load sample data');
    }
  };

  const handleContactChange = (field: keyof ContactData, value: string | string[]) => {
    setContact(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleWebsiteSummaryChange = (index: number, value: string) => {
    const newSummaries = [...contact.website_summaries];
    newSummaries[index] = value;
    setContact(prev => ({
      ...prev,
      website_summaries: newSummaries
    }));
  };

  const addWebsiteSummary = () => {
    setContact(prev => ({
      ...prev,
      website_summaries: [...prev.website_summaries, '']
    }));
  };

  const removeWebsiteSummary = (index: number) => {
    const newSummaries = contact.website_summaries.filter((_, i) => i !== index);
    setContact(prev => ({
      ...prev,
      website_summaries: newSummaries
    }));
  };

  const loadSampleContact = (sampleIndex: number) => {
    if (sampleContacts[sampleIndex]) {
      setContact(sampleContacts[sampleIndex]);
      showMessage('success', 'Sample contact loaded');
    }
  };

  const handleGenerateIcebreaker = async () => {
    if (!contact.first_name || !contact.last_name) {
      showMessage('error', 'Please enter at least first and last name');
      return;
    }

    setLoading(true);
    setResult(null);
    
    try {
      const request: TestRequest = {
        contact,
        use_current_settings: true
      };
      
      const response = await apiService.generateIcebreaker(request);
      setResult(response);
      showMessage('success', 'Icebreaker generated successfully!');
    } catch (error: any) {
      showMessage('error', error.response?.data?.error || 'Failed to generate icebreaker');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const clearForm = () => {
    setContact({
      first_name: '',
      last_name: '',
      headline: '',
      location: '',
      website_summaries: []
    });
    setResult(null);
  };

  return (
    <div className="component-container">
      <h2>Contact Tester</h2>
      <p className="component-description">
        Test your prompts with sample contact data. Perfect for iterating on your icebreaker generation
        before switching to real data.
      </p>

      {message && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="tester-layout">
        <div className="contact-form">
          <h3>Contact Information</h3>
          
          <div className="sample-contacts">
            <label>Quick Load Sample:</label>
            <div className="sample-buttons">
              {sampleContacts.map((sample, index) => (
                <button
                  key={index}
                  onClick={() => loadSampleContact(index)}
                  className="btn btn-small"
                >
                  {sample.first_name} {sample.last_name}
                </button>
              ))}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>First Name *</label>
              <input
                type="text"
                value={contact.first_name}
                onChange={(e) => handleContactChange('first_name', e.target.value)}
                placeholder="Sarah"
              />
            </div>
            <div className="form-group">
              <label>Last Name *</label>
              <input
                type="text"
                value={contact.last_name}
                onChange={(e) => handleContactChange('last_name', e.target.value)}
                placeholder="Johnson"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Headline</label>
            <input
              type="text"
              value={contact.headline}
              onChange={(e) => handleContactChange('headline', e.target.value)}
              placeholder="Marketing Director at TechCorp"
            />
          </div>

          <div className="form-group">
            <label>Location</label>
            <input
              type="text"
              value={contact.location}
              onChange={(e) => handleContactChange('location', e.target.value)}
              placeholder="San Francisco, CA"
            />
          </div>

          <div className="form-group">
            <label>Website Summaries</label>
            {contact.website_summaries.map((summary, index) => (
              <div key={index} className="summary-input">
                <textarea
                  value={summary}
                  onChange={(e) => handleWebsiteSummaryChange(index, e.target.value)}
                  placeholder={`Website summary ${index + 1}...`}
                  rows={3}
                />
                <button
                  onClick={() => removeWebsiteSummary(index)}
                  className="btn btn-small btn-danger"
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              onClick={addWebsiteSummary}
              className="btn btn-small btn-secondary"
            >
              Add Website Summary
            </button>
          </div>

          <div className="button-group">
            <button
              onClick={handleGenerateIcebreaker}
              disabled={loading}
              className="btn btn-primary"
            >
              {loading ? 'Generating...' : 'Generate Icebreaker'}
            </button>
            <button
              onClick={clearForm}
              className="btn btn-secondary"
            >
              Clear Form
            </button>
          </div>
        </div>

        <div className="results-panel">
          <h3>Generated Icebreaker</h3>
          {result ? (
            <div className="result-content">
              <div className="icebreaker-result">
                <h4>Icebreaker:</h4>
                <div className="icebreaker-text">
                  {result.icebreaker.split('\\n').map((line: string, index: number) => (
                    <p key={index}>{line}</p>
                  ))}
                </div>
              </div>
              
              <div className="contact-summary">
                <h4>Contact Used:</h4>
                <p><strong>Name:</strong> {result.contact.first_name} {result.contact.last_name}</p>
                <p><strong>Headline:</strong> {result.contact.headline}</p>
                <p><strong>Location:</strong> {result.contact.location}</p>
                <p><strong>Website Summaries:</strong> {contact.website_summaries.length} provided</p>
              </div>

              <button
                onClick={() => {
                  navigator.clipboard.writeText(result.icebreaker);
                  showMessage('success', 'Icebreaker copied to clipboard');
                }}
                className="btn btn-secondary"
              >
                Copy Icebreaker
              </button>
            </div>
          ) : (
            <div className="no-results">
              <p>Enter contact information and click "Generate Icebreaker" to see results.</p>
              <div className="tips">
                <h4>Testing Tips:</h4>
                <ul>
                  <li>Start with sample contacts to get familiar with the interface</li>
                  <li>Try different website summaries to see how they affect the output</li>
                  <li>Use the Prompt Editor to modify prompts and test changes here</li>
                  <li>This is safe sample data - no real contacts are contacted</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContactTester;