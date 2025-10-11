import React, { useState, useEffect } from 'react';
import '../../styles/ProductConfiguration.css';

interface ProductConfig {
  product_url?: string;
  product_name?: string;
  product_description?: string;
  value_proposition?: string;
  target_audience?: string;
  industry?: string;
  product_features?: string[];
  product_examples?: string[];
  messaging_tone?: string;
  product_analyzed_at?: string;
}

interface ProductConfigurationProps {
  organizationId: string;
  isNewOrganization?: boolean;
  onSave?: () => void;
  onClose?: () => void;
}

const ProductConfiguration: React.FC<ProductConfigurationProps> = ({ 
  organizationId, 
  isNewOrganization = false,
  onSave,
  onClose 
}) => {
  const [productUrl, setProductUrl] = useState('');
  const [productConfig, setProductConfig] = useState<ProductConfig>({});
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [features, setFeatures] = useState<string[]>([]);
  const [examples, setExamples] = useState<string[]>([]);

  useEffect(() => {
    loadProductConfig();
  }, [organizationId]);

  const loadProductConfig = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:8000/organizations/${organizationId}/product-config`);
      if (response.ok) {
        const data = await response.json();
        setProductConfig(data);
        setProductUrl(data.product_url || '');
        setFeatures(data.product_features || []);
        setExamples(data.product_examples || []);
      }
    } catch (error) {
      console.error('Error loading product config:', error);
    } finally {
      setLoading(false);
    }
  };

  const analyzeProductUrl = async () => {
    if (!productUrl) {
      showMessage('error', 'Please enter a product URL');
      return;
    }

    setAnalyzing(true);
    try {
      const response = await fetch('http://localhost:8000/analyze-product-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: productUrl })
      });

      const result = await response.json();
      
      if (result.success) {
        // Update config with analyzed data
        setProductConfig({
          ...productConfig,
          ...result.data,
          product_url: productUrl
        });
        setFeatures(result.data.product_features || []);
        showMessage('success', 'Product details extracted! Please review and customize.');
      } else {
        showMessage('error', result.error || 'Failed to analyze URL');
      }
    } catch (error) {
      showMessage('error', 'Error analyzing URL. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  const saveProductConfig = async () => {
    setLoading(true);
    try {
      const configToSave = {
        ...productConfig,
        product_url: productUrl,
        product_features: features,
        product_examples: examples
      };

      const response = await fetch(`http://localhost:8000/organizations/${organizationId}/product-config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configToSave)
      });

      if (response.ok) {
        showMessage('success', 'Product configuration saved successfully!');
        if (onSave) onSave();
      } else {
        throw new Error('Failed to save configuration');
      }
    } catch (error) {
      showMessage('error', 'Error saving configuration');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const addFeature = () => {
    setFeatures([...features, '']);
  };

  const updateFeature = (index: number, value: string) => {
    const updated = [...features];
    updated[index] = value;
    setFeatures(updated);
  };

  const removeFeature = (index: number) => {
    setFeatures(features.filter((_, i) => i !== index));
  };

  const addExample = () => {
    setExamples([...examples, '']);
  };

  const updateExample = (index: number, value: string) => {
    const updated = [...examples];
    updated[index] = value;
    setExamples(updated);
  };

  const removeExample = (index: number) => {
    setExamples(examples.filter((_, i) => i !== index));
  };

  const industries = [
    { value: 'beauty', label: 'Beauty & Cosmetics' },
    { value: 'technology', label: 'Technology & Software' },
    { value: 'healthcare', label: 'Healthcare & Medical' },
    { value: 'retail', label: 'Retail & E-commerce' },
    { value: 'professional_services', label: 'Professional Services' },
    { value: 'food_beverage', label: 'Food & Beverage' },
    { value: 'education', label: 'Education & Training' },
    { value: 'finance', label: 'Finance & Banking' },
    { value: 'real_estate', label: 'Real Estate' },
    { value: 'manufacturing', label: 'Manufacturing' },
    { value: 'other', label: 'Other' }
  ];

  const tones = [
    { value: 'professional', label: 'Professional', description: 'Formal, business-focused' },
    { value: 'casual', label: 'Casual', description: 'Relaxed, conversational' },
    { value: 'technical', label: 'Technical', description: 'Detailed, specification-focused' },
    { value: 'creative', label: 'Creative', description: 'Innovative, expressive' },
    { value: 'friendly', label: 'Friendly', description: 'Warm, approachable' }
  ];

  return (
    <div className="product-configuration">
      <div className="config-header">
        <h2>{isNewOrganization ? 'Welcome! Let\'s Set Up Your Product' : 'Product Configuration'}</h2>
        <p>
          {isNewOrganization 
            ? 'Tell us about your product or service so we can create personalized outreach messages'
            : 'Define your product or service to generate personalized messaging'}
        </p>
      </div>

      {isNewOrganization && (
        <div className="welcome-message">
          <strong>🚀 Quick Setup:</strong> Enter your product URL below and we'll automatically extract key details. You can then review and customize everything to match your brand voice.
        </div>
      )}

      {message && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="url-analyzer-section">
        <h3>Step 1: Analyze Your Product</h3>
        <div className="url-input-group">
          <input
            type="url"
            value={productUrl}
            onChange={(e) => setProductUrl(e.target.value)}
            placeholder="https://your-product-website.com"
            className="url-input"
          />
          <button
            onClick={analyzeProductUrl}
            disabled={analyzing || !productUrl}
            className="btn btn-primary analyze-btn"
          >
            {analyzing ? '🔍 Analyzing...' : '🔍 Analyze & Auto-fill'}
          </button>
        </div>
        {productConfig.product_analyzed_at && (
          <small className="last-analyzed">
            Last analyzed: {new Date(productConfig.product_analyzed_at).toLocaleString()}
          </small>
        )}
      </div>

      <div className="config-form">
        <h3>Step 2: Review & Customize</h3>
        
        <div className="form-section">
          <div className="form-group">
            <label>Product Name *</label>
            <input
              type="text"
              value={productConfig.product_name || ''}
              onChange={(e) => setProductConfig({ ...productConfig, product_name: e.target.value })}
              placeholder="e.g., Premium Hair Extensions"
              className="form-control"
            />
            <small>The name of your product or service</small>
          </div>

          <div className="form-group">
            <label>Product Description *</label>
            <textarea
              value={productConfig.product_description || ''}
              onChange={(e) => setProductConfig({ ...productConfig, product_description: e.target.value })}
              placeholder="Brief description of what you offer..."
              className="form-control"
              rows={3}
            />
            <small>What you offer in 1-2 sentences</small>
          </div>

          <div className="form-group">
            <label>Value Proposition *</label>
            <textarea
              value={productConfig.value_proposition || ''}
              onChange={(e) => setProductConfig({ ...productConfig, value_proposition: e.target.value })}
              placeholder="The main benefit or problem you solve..."
              className="form-control"
              rows={2}
            />
            <small>The key value you provide to customers</small>
          </div>

          <div className="form-group">
            <label>Target Audience *</label>
            <input
              type="text"
              value={productConfig.target_audience || ''}
              onChange={(e) => setProductConfig({ ...productConfig, target_audience: e.target.value })}
              placeholder="e.g., Salon owners and professional stylists"
              className="form-control"
            />
            <small>Who would buy or use your product/service</small>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Industry Category</label>
              <select
                value={productConfig.industry || 'other'}
                onChange={(e) => setProductConfig({ ...productConfig, industry: e.target.value })}
                className="form-control"
              >
                {industries.map(ind => (
                  <option key={ind.value} value={ind.value}>{ind.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Messaging Tone</label>
              <select
                value={productConfig.messaging_tone || 'professional'}
                onChange={(e) => setProductConfig({ ...productConfig, messaging_tone: e.target.value })}
                className="form-control"
              >
                {tones.map(tone => (
                  <option key={tone.value} value={tone.value}>
                    {tone.label} - {tone.description}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="form-section">
          <h4>Key Features & Benefits</h4>
          <div className="dynamic-list">
            {features.map((feature, index) => (
              <div key={index} className="dynamic-item">
                <input
                  type="text"
                  value={feature}
                  onChange={(e) => updateFeature(index, e.target.value)}
                  placeholder="Enter a key feature or benefit"
                  className="form-control"
                />
                <button
                  onClick={() => removeFeature(index)}
                  className="btn btn-danger btn-small"
                >
                  Remove
                </button>
              </div>
            ))}
            <button onClick={addFeature} className="btn btn-secondary">
              + Add Feature
            </button>
          </div>
        </div>

        <div className="form-section">
          <h4>Example Icebreakers (Optional)</h4>
          <p className="section-description">
            Add examples of good icebreakers for your product to guide AI generation
          </p>
          <div className="dynamic-list">
            {examples.map((example, index) => (
              <div key={index} className="dynamic-item">
                <textarea
                  value={example}
                  onChange={(e) => updateExample(index, e.target.value)}
                  placeholder="Enter an example icebreaker message..."
                  className="form-control"
                  rows={2}
                />
                <button
                  onClick={() => removeExample(index)}
                  className="btn btn-danger btn-small"
                >
                  Remove
                </button>
              </div>
            ))}
            <button onClick={addExample} className="btn btn-secondary">
              + Add Example
            </button>
          </div>
        </div>

        <div className="preview-section">
          <h4>Preview</h4>
          <div className="preview-box">
            <p><strong>Product:</strong> {productConfig.product_name || '[Product Name]'}</p>
            <p><strong>For:</strong> {productConfig.target_audience || '[Target Audience]'}</p>
            <p><strong>Value:</strong> {productConfig.value_proposition || '[Value Proposition]'}</p>
            <p><strong>Tone:</strong> {productConfig.messaging_tone || 'professional'}</p>
          </div>
        </div>
      </div>

      <div className="config-actions">
        <button
          onClick={saveProductConfig}
          disabled={loading}
          className="btn btn-primary"
        >
          {loading ? 'Saving...' : 'Save Configuration'}
        </button>
        {onClose && (
          <button onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
        )}
      </div>
    </div>
  );
};

export default ProductConfiguration;