import React, { useState } from 'react';
import { useProducts, Product } from '../../hooks/useProducts';
import { ProductFormModal } from './ProductFormModal';
import '../../styles/ProductsList.css';

interface ProductsListProps {
  organizationId: string;
}

export function ProductsList({ organizationId }: ProductsListProps) {
  const { data: products = [], isLoading, isError, refetch } = useProducts(organizationId);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleDelete = async (product: Product) => {
    // Cannot delete if it's the only product or if it's default
    if (product.is_default && products.length > 1) {
      showMessage('error', 'Cannot delete default product. Set another product as default first.');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete "${product.name}"?`)) {
      return;
    }

    try {
      setDeletingId(product.id);

      const response = await fetch(
        `/products/${product.id}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete product');
      }

      showMessage('success', 'Product deleted successfully');
      refetch();
    } catch (err: any) {
      showMessage('error', err.message || 'An error occurred while deleting the product');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSetDefault = async (product: Product) => {
    if (product.is_default) {
      return; // Already default
    }

    try {
      const response = await fetch(
        `/products/${product.id}/set-default`,
        {
          method: 'PUT',
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to set default product');
      }

      showMessage('success', `"${product.name}" is now the default product`);
      refetch();
    } catch (err: any) {
      showMessage('error', err.message || 'An error occurred while setting default product');
    }
  };

  const handleFormSuccess = () => {
    showMessage('success', editingProduct ? 'Product updated successfully' : 'Product created successfully');
    refetch();
  };

  if (isLoading) {
    return (
      <div className="products-list">
        <div className="products-loading">
          <p>Loading products...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="products-list">
        <div className="message error">
          Failed to load products. Please try again.
        </div>
      </div>
    );
  }

  return (
    <div className="products-list">
      <div className="products-header">
        <h3>Products & Services</h3>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          + New Product
        </button>
      </div>

      {message && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      {products.length === 0 ? (
        <div className="products-empty">
          <div className="empty-icon">📦</div>
          <h4>No products yet</h4>
          <p>Create your first product to start managing campaigns.</p>
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            Create First Product
          </button>
        </div>
      ) : (
        <div className="products-grid">
          {products.map((product) => (
            <div key={product.id} className={`product-card ${product.is_default ? 'default' : ''}`}>
              <div className="product-header">
                <h4>{product.name}</h4>
                {product.is_default && <span className="badge badge-default">⭐ Default</span>}
                {!product.is_active && <span className="badge badge-inactive">Inactive</span>}
              </div>

              {product.description && (
                <p className="product-description">{product.description}</p>
              )}

              <div className="product-details">
                {product.target_audience && (
                  <div className="product-detail">
                    <strong>Target:</strong> {product.target_audience}
                  </div>
                )}
                {product.industry && (
                  <div className="product-detail">
                    <strong>Industry:</strong> {product.industry}
                  </div>
                )}
                {product.messaging_tone && (
                  <div className="product-detail">
                    <strong>Tone:</strong> {product.messaging_tone}
                  </div>
                )}
                {product.target_categories && product.target_categories.length > 0 && (
                  <div className="product-detail">
                    <strong>Categories:</strong> {product.target_categories.slice(0, 3).join(', ')}
                    {product.target_categories.length > 3 && ` +${product.target_categories.length - 3} more`}
                  </div>
                )}
              </div>

              <div className="product-actions">
                <button
                  className="btn btn-secondary btn-small"
                  onClick={() => setEditingProduct(product)}
                >
                  ✏️ Edit
                </button>

                {!product.is_default && (
                  <button
                    className="btn btn-info btn-small"
                    onClick={() => handleSetDefault(product)}
                  >
                    ⭐ Set Default
                  </button>
                )}

                <button
                  className="btn btn-danger btn-small"
                  onClick={() => handleDelete(product)}
                  disabled={deletingId === product.id}
                >
                  {deletingId === product.id ? '...' : '🗑️ Delete'}
                </button>
              </div>

              <div className="product-meta">
                <small>Created {new Date(product.created_at).toLocaleDateString()}</small>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <ProductFormModal
          organizationId={organizationId}
          product={null}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleFormSuccess}
        />
      )}

      {/* Edit Modal */}
      {editingProduct && (
        <ProductFormModal
          organizationId={organizationId}
          product={editingProduct}
          onClose={() => setEditingProduct(null)}
          onSuccess={handleFormSuccess}
        />
      )}
    </div>
  );
}
