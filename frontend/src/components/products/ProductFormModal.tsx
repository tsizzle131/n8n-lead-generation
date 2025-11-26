import React, { useState, useEffect } from 'react';
import { Product } from '../../hooks/useProducts';
import '../../styles/ProductFormModal.css';

interface ProductFormModalProps {
  organizationId: string;
  product?: Product | null;
  onClose: () => void;
  onSuccess: () => void;
}

interface ProductFormData {
  name: string;
  slug: string;
  description: string;
  product_url: string;
  value_proposition: string;
  target_audience: string;
  industry: string;
  messaging_tone: string;
  product_features: string;
  product_examples: string;
  custom_icebreaker_prompt: string;
  target_categories: string;
}

const initialFormData: ProductFormData = {
  name: '',
  slug: '',
  description: '',
  product_url: '',
  value_proposition: '',
  target_audience: '',
  industry: '',
  messaging_tone: 'professional',
  product_features: '',
  product_examples: '',
  custom_icebreaker_prompt: '',
  target_categories: '',
};

export function ProductFormModal({ organizationId, product, onClose, onSuccess }: ProductFormModalProps) {
  const [formData, setFormData] = useState<ProductFormData>(initialFormData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const isEditMode = !!product;

  // Load product data when editing
  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        slug: product.slug || '',
        description: product.description || '',
        product_url: product.product_url || '',
        value_proposition: product.value_proposition || '',
        target_audience: product.target_audience || '',
        industry: product.industry || '',
        messaging_tone: product.messaging_tone || 'professional',
        product_features: product.product_features?.join(', ') || '',
        product_examples: product.product_examples?.join(', ') || '',
        custom_icebreaker_prompt: product.custom_icebreaker_prompt || '',
        target_categories: product.target_categories?.join(', ') || '',
      });
      // Show advanced section if any advanced fields are filled
      if (product.product_features || product.product_examples || product.target_categories) {
        setShowAdvanced(true);
      }
    }
  }, [product]);

  // Auto-generate slug from name
  const handleNameChange = (name: string) => {
    setFormData({
      ...formData,
      name,
      slug: name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, ''),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.name.trim()) {
      setError('Product name is required');
      return;
    }

    try {
      setLoading(true);

      // Convert comma-separated strings to arrays
      const productData = {
        name: formData.name.trim(),
        slug: formData.slug.trim() || undefined,
        description: formData.description.trim() || undefined,
        product_url: formData.product_url.trim() || undefined,
        value_proposition: formData.value_proposition.trim() || undefined,
        target_audience: formData.target_audience.trim() || undefined,
        industry: formData.industry.trim() || undefined,
        messaging_tone: formData.messaging_tone || 'professional',
        product_features: formData.product_features.trim()
          ? formData.product_features.split(',').map((f) => f.trim()).filter(Boolean)
          : undefined,
        product_examples: formData.product_examples.trim()
          ? formData.product_examples.split(',').map((e) => e.trim()).filter(Boolean)
          : undefined,
        custom_icebreaker_prompt: formData.custom_icebreaker_prompt.trim() || undefined,
        target_categories: formData.target_categories.trim()
          ? formData.target_categories.split(',').map((c) => c.trim()).filter(Boolean)
          : undefined,
      };

      const url = isEditMode
        ? `/products/${product!.id}`
        : `/organizations/${organizationId}/products`;

      const method = isEditMode ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(productData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save product');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving the product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal product-form-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{isEditMode ? 'Edit Product' : 'Create New Product'}</h3>
          <button className="modal-close" onClick={onClose} type="button">
            ×
          </button>
        </div>

        {error && (
          <div className="message error">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-section">
            <h4>Basic Information</h4>

            <div className="form-group">
              <label htmlFor="name">Product Name *</label>
              <input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="form-control"
                placeholder="e.g., Premium CRM Software"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="slug">Slug</label>
              <input
                id="slug"
                type="text"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                className="form-control"
                placeholder="Auto-generated from name"
              />
              <small className="form-help">URL-friendly identifier (auto-generated if left empty)</small>
            </div>

            <div className="form-group">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="form-control"
                rows={3}
                placeholder="Brief description of the product"
              />
            </div>

            <div className="form-group">
              <label htmlFor="product_url">Product URL</label>
              <input
                id="product_url"
                type="url"
                value={formData.product_url}
                onChange={(e) => setFormData({ ...formData, product_url: e.target.value })}
                className="form-control"
                placeholder="https://example.com/product"
              />
            </div>
          </div>

          <div className="form-section">
            <h4>Marketing Details</h4>

            <div className="form-group">
              <label htmlFor="value_proposition">Value Proposition</label>
              <textarea
                id="value_proposition"
                value={formData.value_proposition}
                onChange={(e) => setFormData({ ...formData, value_proposition: e.target.value })}
                className="form-control"
                rows={2}
                placeholder="What makes this product valuable to customers?"
              />
            </div>

            <div className="form-group">
              <label htmlFor="target_audience">Target Audience</label>
              <textarea
                id="target_audience"
                value={formData.target_audience}
                onChange={(e) => setFormData({ ...formData, target_audience: e.target.value })}
                className="form-control"
                rows={2}
                placeholder="Who is this product for?"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="industry">Industry</label>
                <input
                  id="industry"
                  type="text"
                  value={formData.industry}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                  className="form-control"
                  placeholder="e.g., Software, Healthcare"
                />
              </div>

              <div className="form-group">
                <label htmlFor="messaging_tone">Messaging Tone</label>
                <select
                  id="messaging_tone"
                  value={formData.messaging_tone}
                  onChange={(e) => setFormData({ ...formData, messaging_tone: e.target.value })}
                  className="form-control"
                >
                  <option value="professional">Professional</option>
                  <option value="casual">Casual</option>
                  <option value="friendly">Friendly</option>
                  <option value="technical">Technical</option>
                  <option value="formal">Formal</option>
                </select>
              </div>
            </div>
          </div>

          <div className="form-section">
            <h4>AI Icebreaker Prompt</h4>

            <div className="form-group">
              <label htmlFor="custom_icebreaker_prompt">Custom Icebreaker Prompt</label>
              <textarea
                id="custom_icebreaker_prompt"
                value={formData.custom_icebreaker_prompt}
                onChange={(e) => setFormData({ ...formData, custom_icebreaker_prompt: e.target.value })}
                className="form-control"
                rows={5}
                placeholder="Instructions for AI to generate personalized icebreakers for this product..."
              />
              <small className="form-help">
                This prompt will be used by AI to generate personalized outreach messages
              </small>
            </div>
          </div>

          {/* Advanced Section */}
          <div className="form-section">
            <button
              type="button"
              className="btn btn-link"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              {showAdvanced ? '▼' : '▶'} Advanced Options
            </button>

            {showAdvanced && (
              <>
                <div className="form-group">
                  <label htmlFor="target_categories">Target Categories</label>
                  <input
                    id="target_categories"
                    type="text"
                    value={formData.target_categories}
                    onChange={(e) => setFormData({ ...formData, target_categories: e.target.value })}
                    className="form-control"
                    placeholder="Restaurants, Retail Stores, Professional Services"
                  />
                  <small className="form-help">Comma-separated list of business categories this product targets</small>
                </div>

                <div className="form-group">
                  <label htmlFor="product_features">Product Features</label>
                  <input
                    id="product_features"
                    type="text"
                    value={formData.product_features}
                    onChange={(e) => setFormData({ ...formData, product_features: e.target.value })}
                    className="form-control"
                    placeholder="Real-time analytics, Mobile app, API access"
                  />
                  <small className="form-help">Comma-separated list of key features</small>
                </div>

                <div className="form-group">
                  <label htmlFor="product_examples">Product Examples</label>
                  <input
                    id="product_examples"
                    type="text"
                    value={formData.product_examples}
                    onChange={(e) => setFormData({ ...formData, product_examples: e.target.value })}
                    className="form-control"
                    placeholder="Case study 1, Use case 2, Customer story 3"
                  />
                  <small className="form-help">Comma-separated list of examples or case studies</small>
                </div>
              </>
            )}
          </div>

          <div className="modal-actions">
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : isEditMode ? 'Update Product' : 'Create Product'}
            </button>
            <button type="button" onClick={onClose} className="btn btn-secondary" disabled={loading}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
