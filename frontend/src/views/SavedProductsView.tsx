import React, { useState, useEffect } from 'react';
import { Product } from '../types';
import { api } from '../services/api';
import { useLanguage } from '../i18n';
import { Bookmark, Star, Trash2, ArrowRight, GitCompare, Search, Plus } from 'lucide-react';

interface SavedProductsViewProps {
  onSelectProduct: (product: Product) => void;
  onNavigate: (view: string, params?: any) => void;
}

export const SavedProductsView: React.FC<SavedProductsViewProps> = ({
  onSelectProduct,
  onNavigate,
}) => {
  const { t } = useLanguage();
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [favoriteOnly, setFavoriteOnly] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchProducts = () => {
    api.getProducts(searchQuery, favoriteOnly)
      .then((res) => {
        setProducts(res);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchProducts();
  }, [searchQuery, favoriteOnly]);

  const handleToggleFav = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.toggleFavorite(id);
      fetchProducts();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to remove this product?')) return;
    try {
      await api.deleteProduct(id);
      fetchProducts();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCardClick = (product: Product) => {
    onSelectProduct(product);
    onNavigate('results', { product });
  };

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, marginBottom: '0.35rem' }}>
            {t.navSaved}
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Your scanned packaged goods and favorites saved in local SQLite storage.
          </p>
        </div>

        <button onClick={() => onNavigate('scan')} className="btn btn-primary btn-sm">
          <Plus size={16} />
          {t.scanNow}
        </button>
      </div>

      {/* Search and Filter */}
      <div className="glass-card" style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
            <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search saved products by name, brand..."
              className="form-input"
              style={{ paddingLeft: '2.4rem' }}
            />
          </div>

          <button
            onClick={() => setFavoriteOnly(!favoriteOnly)}
            className={`btn btn-sm ${favoriteOnly ? 'btn-primary' : 'btn-secondary'}`}
          >
            <Star size={15} fill={favoriteOnly ? '#fff' : 'none'} />
            Favorites Only
          </button>
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid-cols-2">
        {products.map((prod) => (
          <div
            key={prod.id}
            onClick={() => handleCardClick(prod)}
            className="glass-card interactive"
            style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <div>
                  <span className="badge badge-source" style={{ fontSize: '0.68rem', marginBottom: '0.35rem' }}>
                    {prod.category || 'Packaged Item'}
                  </span>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>{prod.name}</h3>
                  {prod.brand && (
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      Brand: {prod.brand}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '0.35rem' }}>
                  <button
                    onClick={(e) => handleToggleFav(prod.id, e)}
                    style={{
                      background: 'rgba(255,255,255,0.08)',
                      borderRadius: '50%',
                      width: 32,
                      height: 32,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: prod.is_favorite ? 'var(--accent-amber)' : 'var(--text-muted)',
                    }}
                    title="Toggle Favorite"
                  >
                    <Star size={16} fill={prod.is_favorite ? 'var(--accent-amber)' : 'none'} />
                  </button>

                  <button
                    onClick={(e) => handleDelete(prod.id, e)}
                    style={{
                      background: 'rgba(244,63,94,0.1)',
                      borderRadius: '50%',
                      width: 32,
                      height: 32,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#f43f5e',
                    }}
                    title="Delete Product"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', margin: '0.75rem 0', fontSize: '0.8rem' }}>
                {prod.mrp && (
                  <div style={{ background: 'var(--bg-surface)', padding: '0.3rem 0.6rem', borderRadius: 'var(--radius-sm)' }}>
                    MRP: <strong>₹{prod.mrp.toFixed(2)}</strong>
                  </div>
                )}
                {prod.net_quantity_value && (
                  <div style={{ background: 'var(--bg-surface)', padding: '0.3rem 0.6rem', borderRadius: 'var(--radius-sm)' }}>
                    Net: <strong>{prod.net_quantity_value}{prod.net_quantity_unit}</strong>
                  </div>
                )}
                {prod.energy_kcal && (
                  <div style={{ background: 'var(--bg-surface)', padding: '0.3rem 0.6rem', borderRadius: 'var(--radius-sm)' }}>
                    ⚡ <strong>{prod.energy_kcal} kcal</strong>/100{prod.net_quantity_unit || 'g'}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)', marginTop: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--accent-emerald-light)', fontWeight: 600 }}>
                View Label & Calculator
              </span>
              <ArrowRight size={16} color="var(--accent-emerald-light)" />
            </div>
          </div>
        ))}

        {products.length === 0 && !loading && (
          <div className="glass-card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2.5rem' }}>
            <Bookmark size={36} color="var(--text-muted)" style={{ margin: '0 auto 0.75rem auto' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.35rem' }}>
              No Saved Products Found
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>
              Scan a package label or try one of the Tech Expo demo products to save items.
            </p>
            <button onClick={() => onNavigate('scan')} className="btn btn-primary btn-sm">
              Scan Now
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
