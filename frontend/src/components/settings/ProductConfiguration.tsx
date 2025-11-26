import React, { useState, useEffect } from 'react';
import '../../styles/ProductConfiguration.css';

interface ProductConfig {
  company_mission?: string;
  core_values?: string[];
  company_story?: string;
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
  const [coreValues, setCoreValues] = useState<string[]>([]);
  const [features, setFeatures] = useState<string[]>([]);
  const [examples, setExamples] = useState<string[]>([]);

  useEffect(() => {
    loadProductConfig();
  }, [organizationId]);

  const loadProductConfig = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/organizations/${organizationId}/product-config`);
      if (response.ok) {
        const data = await response.json();
        setProductConfig(data);
        setProductUrl(data.product_url || '');
        setCoreValues(data.core_values || []);
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
      const response = await fetch('/analyze-product-url', {
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
        core_values: coreValues.filter(v => v.trim()),
        product_features: features,
        product_examples: examples
      };

      const response = await fetch(`/organizations/${organizationId}/product-config`, {
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

  const addValue = () => {
    setCoreValues([...coreValues, '']);
  };

  const updateValue = (index: number, value: string) => {
    const updated = [...coreValues];
    updated[index] = value;
    setCoreValues(updated);
  };

  const removeValue = (index: number) => {
    setCoreValues(coreValues.filter((_, i) => i !== index));
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

  // Calculate completion percentage
  const calculateCompletion = (): number => {
    const requiredFields = [
      'company_mission',
      'product_name',
      'product_description',
      'value_proposition',
      'target_audience'
    ];

    let filledCount = 0;

    // Check text fields
    const textFields = requiredFields.filter(f => f !== 'core_values');
    filledCount += textFields.filter(field =>
      productConfig[field as keyof ProductConfig] &&
      String(productConfig[field as keyof ProductConfig]).trim().length > 0
    ).length;

    // Check core values (need at least 2)
    if (coreValues.filter(v => v.trim()).length >= 2) {
      filledCount += 1;
    }

    return Math.round((filledCount / (requiredFields.length + 1)) * 100);
  };

  const completion = calculateCompletion();

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

      {/* Completion Progress Indicator */}
      <div style={{ margin: '20px 0', padding: '15px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontWeight: 600, color: '#111827' }}>
            Setup Progress
          </span>
          <span style={{
            fontWeight: 600,
            color: completion === 100 ? '#10b981' : completion >= 50 ? '#f59e0b' : '#ef4444'
          }}>
            {completion}% Complete
          </span>
        </div>
        <div style={{
          height: '12px',
          backgroundColor: '#e5e7eb',
          borderRadius: '6px',
          overflow: 'hidden'
        }}>
          <div style={{
            height: '100%',
            width: `${completion}%`,
            backgroundColor: completion === 100 ? '#10b981' : completion >= 50 ? '#f59e0b' : '#ef4444',
            transition: 'width 0.3s ease',
            borderRadius: '6px'
          }}></div>
        </div>
        <div style={{ marginTop: '8px', fontSize: '14px', color: '#6b7280' }}>
          {completion === 100 ? (
            <span style={{ color: '#10b981', fontWeight: 500 }}>
              ✓ All required fields complete! Your AI emails will be highly personalized.
            </span>
          ) : (
            <span>
              Fill in all <strong style={{ color: '#111827' }}>6 required fields</strong> marked with * to generate personalized, high-converting emails.
            </span>
          )}
        </div>
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

      {/* About Your Company Section */}
      <div className="config-form company-context-section">
        <h3>🏢 About Your Company</h3>
        <p style={{ color: '#6b7280', marginBottom: '20px' }}>
          Tell us about your company to create more authentic, values-aligned messaging
        </p>

        <div className="form-section">
          <div className="form-group">
            <label>Company Mission * <span style={{color: '#10b981', fontWeight: 'normal'}}>{productConfig.company_mission && '✓'}</span></label>
            <textarea
              value={productConfig.company_mission || ''}
              onChange={(e) => setProductConfig({ ...productConfig, company_mission: e.target.value })}
              placeholder="e.g., We help local restaurants increase online orders through AI-powered marketing"
              className="form-control"
              rows={2}
            />
            <small style={{color: '#6b7280'}}>
              💡 What does your company do? Why do you exist? (100-300 chars recommended)
            </small>
          </div>

          <div className="form-group">
            <label>Core Values * <span style={{color: '#10b981', fontWeight: 'normal'}}>{coreValues.filter(v => v.trim()).length >= 2 && '✓'}</span></label>
            <div style={{ marginBottom: '8px' }}>
              {coreValues.map((value, index) => (
                <div key={index} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => updateValue(index, e.target.value)}
                    placeholder="e.g., Quality, Innovation, Customer-first"
                    className="form-control"
                    style={{ flex: 1 }}
                  />
                  <button
                    onClick={() => removeValue(index)}
                    className="btn btn-danger btn-small"
                    type="button"
                  >
                    ✕
                  </button>
                </div>
              ))}
              {coreValues.length < 5 && (
                <button onClick={addValue} className="btn btn-secondary btn-small" type="button">
                  + Add Value
                </button>
              )}
            </div>
            <small style={{color: '#6b7280'}}>
              💡 Add 2-5 core values/principles (e.g., Quality, Transparency, Innovation, Sustainability)
            </small>
          </div>

          <div className="form-group">
            <label>Company Story (Optional)</label>
            <textarea
              value={productConfig.company_story || ''}
              onChange={(e) => setProductConfig({ ...productConfig, company_story: e.target.value })}
              placeholder="Your origin story or what drives you..."
              className="form-control"
              rows={3}
            />
            <small style={{color: '#6b7280'}}>
              💡 Share your journey, what inspired you to start, or what makes your company unique
            </small>
          </div>
        </div>
      </div>

      <div className="config-form">
        <h3>Step 2: Review & Customize</h3>

        <div className="form-section">
          <div className="form-group">
            <label>Product Name * <span style={{color: '#10b981', fontWeight: 'normal'}}>{productConfig.product_name && '✓'}</span></label>
            <input
              type="text"
              value={productConfig.product_name || ''}
              onChange={(e) => setProductConfig({ ...productConfig, product_name: e.target.value })}
              placeholder="e.g., Premium Hair Extensions, Custom Web Development, AI Chatbot Platform"
              className="form-control"
            />
            <small style={{color: '#6b7280'}}>
              💡 <strong>Tip:</strong> Be specific! "AI-Powered Website Chat" is better than "Software Solution"
            </small>
          </div>

          <div className="form-group">
            <label>Product Description * <span style={{color: '#10b981', fontWeight: 'normal'}}>{productConfig.product_description && '✓'}</span></label>
            <textarea
              value={productConfig.product_description || ''}
              onChange={(e) => setProductConfig({ ...productConfig, product_description: e.target.value })}
              placeholder="e.g., We build high-performance, custom websites and web applications that help businesses grow. Specializing in modern tech stacks, SEO optimization, and conversion-focused design."
              className="form-control"
              rows={4}
            />
            <small style={{color: '#6b7280'}}>
              💡 <strong>What to include:</strong> What you do, what makes you different, key features/specialties<br/>
              <span style={{color: '#9ca3af', fontSize: '12px'}}>Good: "100% human hair extensions sourced from India, available in 15 textures with wholesale options"</span>
            </small>
          </div>

          <div className="form-group">
            <label>Value Proposition * <span style={{color: '#10b981', fontWeight: 'normal'}}>{productConfig.value_proposition && '✓'}</span></label>
            <textarea
              value={productConfig.value_proposition || ''}
              onChange={(e) => setProductConfig({ ...productConfig, value_proposition: e.target.value })}
              placeholder="e.g., Turn your website into your #1 sales tool with fast, beautiful, conversion-optimized web development that actually drives revenue."
              className="form-control"
              rows={3}
            />
            <small style={{color: '#6b7280'}}>
              💡 <strong>Focus on outcomes:</strong> What specific results do customers get? Use numbers when possible.<br/>
              <span style={{color: '#9ca3af', fontSize: '12px'}}>Examples: "3x more online orders in 30 days" • "Save 10 hours/week on scheduling" • "Increase patient bookings by 40%"</span>
            </small>
          </div>

          <div className="form-group">
            <label>Target Audience * <span style={{color: '#10b981', fontWeight: 'normal'}}>{productConfig.target_audience && '✓'}</span></label>
            <input
              type="text"
              value={productConfig.target_audience || ''}
              onChange={(e) => setProductConfig({ ...productConfig, target_audience: e.target.value })}
              placeholder="e.g., Salon owners and professional stylists, Small dental practices, Restaurant owners with 5-50 employees"
              className="form-control"
            />
            <small style={{color: '#6b7280'}}>
              💡 <strong>Be specific about:</strong> Industry + Role/Size + Pain Point<br/>
              <span style={{color: '#9ca3af', fontSize: '12px'}}>Good: "Busy restaurant owners struggling with online order management"</span>
            </small>
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