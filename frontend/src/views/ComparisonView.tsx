import React, { useState, useEffect } from 'react';
import { Product, ProductCompareResponse } from '../types';
import { ProductSlotInput } from '../components/ProductSlotInput';
import { api } from '../services/api';
import { useLanguage } from '../i18n';
import {
  GitCompare,
  AlertTriangle,
  Tag,
  Sparkles,
  RefreshCw,
  Scale,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

interface ComparisonViewProps {
  initialProductA?: Product;
  onNavigate: (view: string) => void;
}

export const ComparisonView: React.FC<ComparisonViewProps> = ({
  initialProductA,
  onNavigate,
}) => {
  const { t } = useLanguage();
  const [savedProducts, setSavedProducts] = useState<Product[]>([]);
  const [productA, setProductA] = useState<Product | null>(initialProductA || null);
  const [productB, setProductB] = useState<Product | null>(null);
  const [compareResult, setCompareResult] = useState<ProductCompareResponse | null>(null);
  const [isComparing, setIsComparing] = useState<boolean>(false);
  const [compareError, setCompareError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.getDemoProducts().catch(() => []),
      api.getProducts().catch(() => []),
    ]).then(([demos, saved]) => {
      const combined = [...demos, ...saved];
      const unique = Array.from(new Map(combined.map((item) => [item.id, item])).values());
      setSavedProducts(unique);

      if (!productA && unique.length >= 1) {
        setProductA(unique[0]);
      }
      if (!productB && unique.length >= 2) {
        setProductB(unique[1]);
      }
    });
  }, [initialProductA]);

  const handleRunComparison = async () => {
    if (!productA || !productB) {
      setCompareError('Please configure both Product A and Product B before comparing.');
      return;
    }

    setCompareError(null);
    setIsComparing(true);

    try {
      const res = await api.compareProducts({
        product_a: productA,
        product_b: productB,
      });
      setCompareResult(res);
    } catch (err: any) {
      console.error('Comparison error:', err);
      setCompareError(err.message || 'Failed to generate comparison.');
    } finally {
      setIsComparing(false);
    }
  };

  // Re-run comparison automatically when either product updates (if result is already open)
  useEffect(() => {
    if (productA && productB) {
      handleRunComparison();
    } else {
      setCompareResult(null);
    }
  }, [productA, productB]);

  return (
    <div className="fade-in">
      {/* Title */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.85rem', fontWeight: 800, marginBottom: '0.35rem' }}>
          {t.compareTitle}
        </h1>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          Compare any two products side-by-side. Each slot independently supports camera scanning, file uploads, saved items, or manual entry.
        </p>
      </div>

      {/* Two Independent Product Slots */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <ProductSlotInput
          slotId="A"
          slotTitle="Product A (Primary)"
          accentColor="#245B4A"
          currentProduct={productA}
          onProductChange={(p) => setProductA(p)}
          savedProductsList={savedProducts}
        />

        <ProductSlotInput
          slotId="B"
          slotTitle="Product B (Comparison)"
          accentColor="#292D32"
          currentProduct={productB}
          onProductChange={(p) => setProductB(p)}
          savedProductsList={savedProducts}
        />
      </div>

      {/* Compare Action Button & Missing Data Guidance */}
      <div className="glass-card" style={{ marginBottom: '2rem', textAlign: 'center', padding: '1.5rem' }}>
        <button
          onClick={handleRunComparison}
          disabled={!productA || !productB || isComparing}
          className="btn btn-primary"
          style={{ padding: '0.8rem 2.25rem', fontSize: '1.05rem', margin: '0 auto' }}
        >
          {isComparing ? (
            <>
              <RefreshCw size={18} className="pulse-glow" />
              Comparing Products...
            </>
          ) : (
            <>
              <GitCompare size={20} />
              Compare Products A & B
            </>
          )}
        </button>

        {(!productA || !productB) && (
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
            {!productA && !productB
              ? 'Please add or select both Product A and Product B above to compare.'
              : !productA
              ? 'Please configure Product A above.'
              : 'Please configure Product B above.'}
          </p>
        )}

        {compareError && (
          <div style={{ color: 'var(--color-error)', fontSize: '0.82rem', marginTop: '0.75rem' }}>
            ⚠️ {compareError}
          </div>
        )}
      </div>

      {/* Incompatibility Notice */}
      {compareResult && !compareResult.are_units_compatible && (
        <div
          className="glass-card"
          style={{
            marginBottom: '1.5rem',
            borderLeft: '4px solid var(--color-warning)',
            background: 'rgba(185, 130, 53, 0.1)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-warning)', fontWeight: 700 }}>
            <AlertTriangle size={18} />
            <span>Unit Notice: Unlike Commodity Formats</span>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            {compareResult.incompatibility_reason}
          </p>
        </div>
      )}

      {/* Comparison Results Section */}
      {compareResult && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Key Consumer Takeaways Card */}
          <div className="glass-card" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(6, 182, 212, 0.08) 100%)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <Sparkles size={18} color="var(--accent-emerald)" />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                {t.keyTakeaways}
              </h3>
            </div>
            <ul style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.88rem', color: 'var(--text-primary)' }}>
              {compareResult.key_takeaways.map((note, idx) => (
                <li key={idx}>{note}</li>
              ))}
            </ul>
          </div>

          {/* Value For Money Comparison Table */}
          <div className="glass-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <Tag size={18} color="var(--accent-emerald)" />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                Value & Unit Price Comparison
              </h3>
            </div>

            <div className="table-responsive">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Metric</th>
                    <th style={{ color: 'var(--primary)' }}>{compareResult.product_a_name}</th>
                    <th style={{ color: 'var(--secondary)' }}>{compareResult.product_b_name}</th>
                    <th>Difference / Advantage</th>
                  </tr>
                </thead>
                <tbody>
                  {compareResult.value_rows.map((row, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600 }}>{row.metric}</td>
                      <td style={{ fontWeight: 700 }}>{row.val_a_display}</td>
                      <td style={{ fontWeight: 700 }}>{row.val_b_display}</td>
                      <td>
                        {row.diff_display && (
                          <span
                            className={`badge ${
                              row.favorable_indicator === 'equal'
                                ? 'badge-calc'
                                : row.favorable_indicator === 'a'
                                ? 'badge-source'
                                : 'badge-warning'
                            }`}
                          >
                            {row.diff_display}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Nutritional Facts Side-by-Side */}
          <div className="glass-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                Nutritional Comparison ({compareResult.normalized_basis})
              </h3>
              <span className="badge badge-calc">Normalized per 100g/ml</span>
            </div>

            <div className="table-responsive">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Nutrient</th>
                    <th style={{ color: 'var(--primary)' }}>{compareResult.product_a_name}</th>
                    <th style={{ color: 'var(--secondary)' }}>{compareResult.product_b_name}</th>
                    <th>Difference</th>
                  </tr>
                </thead>
                <tbody>
                  {compareResult.nutrition_rows.map((row, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600 }}>{row.metric} ({row.unit})</td>
                      <td style={{ fontWeight: 700, color: row.favorable_indicator === 'a' ? 'var(--primary)' : 'inherit' }}>
                        {row.val_a_display}
                      </td>
                      <td style={{ fontWeight: 700, color: row.favorable_indicator === 'b' ? 'var(--secondary)' : 'inherit' }}>
                        {row.val_b_display}
                      </td>
                      <td>
                        {row.diff_display && (
                          <span
                            className={`badge ${
                              row.diff_display === 'Equal'
                                ? 'badge-calc'
                                : row.diff_display.includes('unavailable')
                                ? 'badge-missing'
                                : 'badge-source'
                            }`}
                          >
                            {row.diff_display}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Allergen Statements Side-by-Side */}
          <div className="glass-card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.75rem' }}>
              Allergen Advice Statements
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
              <div style={{ background: 'var(--bg-surface)', padding: '0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(36, 91, 74, 0.25)' }}>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--primary)', marginBottom: '0.25rem' }}>
                  {compareResult.product_a_name}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {compareResult.allergens_comparison.product_a.statement}
                </div>
              </div>

              <div style={{ background: 'var(--bg-surface)', padding: '0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(41, 45, 50, 0.2)' }}>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--secondary)', marginBottom: '0.25rem' }}>
                  {compareResult.product_b_name}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {compareResult.allergens_comparison.product_b.statement}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
