import React, { useEffect, useState } from 'react';
import {
  Scan,
  Calculator,
  GitCompare,
  BookOpen,
  CalendarDays,
  BellRing,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  Info
} from 'lucide-react';
import { Product } from '../types';
import { api } from '../services/api';
import { useLanguage } from '../i18n';

interface HomeDashboardProps {
  onNavigate: (view: string, params?: any) => void;
  onSelectProduct: (product: Product) => void;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  onNavigate,
  onSelectProduct,
}) => {
  const { t } = useLanguage();
  const [demoProducts, setDemoProducts] = useState<Product[]>([]);
  const [recentProducts, setRecentProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    Promise.all([
      api.getDemoProducts().catch(() => []),
      api.getProducts('', false).catch(() => []),
    ]).then(([demos, recents]) => {
      setDemoProducts(demos);
      setRecentProducts(recents.slice(0, 4));
      setLoading(false);
    });
  }, []);

  const handleDemoLaunch = (product: Product) => {
    onSelectProduct(product);
    onNavigate('results', { product });
  };

  return (
    <div className="fade-in">
      {/* Hero Section */}
      <section
        className="glass-card"
        style={{
          padding: '2.5rem 1.75rem',
          marginBottom: '2rem',
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(6, 182, 212, 0.08) 100%), var(--bg-card)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ maxWidth: '720px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.8rem', borderRadius: 'var(--radius-full)', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-emerald-light)', fontSize: '0.8rem', fontWeight: 700, marginBottom: '1rem' }}>
            <Zap size={15} />
            <span>AI-Light, Local-First Consumer Intelligence</span>
          </div>

          <h1 style={{ fontSize: '2.25rem', fontWeight: 800, lineHeight: 1.15, marginBottom: '0.85rem' }}>
            Scan. Understand. Compare.
          </h1>

          <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1.75rem' }}>
            Make informed choices about packaged food. Calculate real calories in your portion, decode confusing additives, check declared allergens, and find genuine value for money without paid AI subscriptions.
          </p>

          <div style={{ display: 'flex', gap: '0.85rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => onNavigate('scan')}
              className="btn btn-primary"
              style={{ padding: '0.75rem 1.5rem', fontSize: '1rem' }}
            >
              <Scan size={18} />
              {t.scanNow}
            </button>

            <button
              onClick={() => onNavigate('calculator')}
              className="btn btn-secondary"
              style={{ padding: '0.75rem 1.25rem' }}
            >
              <Calculator size={18} color="var(--accent-emerald)" />
              {t.navCalculator}
            </button>

            <button
              onClick={() => onNavigate('compare')}
              className="btn btn-secondary"
              style={{ padding: '0.75rem 1.25rem' }}
            >
              <GitCompare size={18} color="#38bdf8" />
              {t.navCompare}
            </button>
          </div>
        </div>
      </section>

      {/* Tech Expo Interactive Demo Products Section */}
      <section style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sparkles size={20} color="var(--accent-amber)" />
              <h2 style={{ fontSize: '1.35rem', fontWeight: 700 }}>
                Tech Expo Interactive Demo Products
              </h2>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              100% offline, verified demo packages with complete nutrition tables, allergen proofs, and prices.
            </p>
          </div>
          <span className="badge badge-source" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fcd34d', borderColor: 'rgba(245, 158, 11, 0.3)' }}>
            Offline Ready
          </span>
        </div>

        <div className="grid-cols-3">
          {demoProducts.map((prod) => (
            <div
              key={prod.id}
              onClick={() => handleDemoLaunch(prod)}
              className="glass-card interactive"
              style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span className="badge badge-source" style={{ fontSize: '0.68rem' }}>
                    {prod.category}
                  </span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-emerald-light)' }}>
                    ₹{prod.mrp?.toFixed(2)}
                  </span>
                </div>

                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                  {prod.name}
                </h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                  Brand: {prod.brand || 'Demo Pack'} | Net: {prod.net_quantity_value}{prod.net_quantity_unit}
                </p>

                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ background: 'var(--bg-surface)', padding: '0.3rem 0.6rem', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem' }}>
                    ⚡ <strong>{prod.energy_kcal} kcal</strong> / 100{prod.net_quantity_unit || 'g'}
                  </div>
                  <div style={{ background: 'var(--bg-surface)', padding: '0.3rem 0.6rem', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem' }}>
                    🏷️ <strong>₹{prod.price_per_standard_unit?.toFixed(2)}</strong> / 100{prod.net_quantity_unit || 'g'}
                  </div>
                </div>

                {prod.allergens_detected && prod.allergens_detected.length > 0 && (
                  <div style={{ fontSize: '0.72rem', color: '#fda4af', marginBottom: '0.5rem' }}>
                    ⚠️ Contains: {prod.allergens_detected.map((a) => a.allergen).join(', ')}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)', marginTop: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--accent-emerald-light)', fontWeight: 600 }}>
                  Explore Full Label & Calculator
                </span>
                <ArrowRight size={16} color="var(--accent-emerald-light)" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Feature Navigation Cards */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>
          Explore Platform Modules
        </h2>

        <div className="grid-cols-3">
          <div
            onClick={() => onNavigate('scan')}
            className="glass-card interactive"
            style={{ cursor: 'pointer' }}
          >
            <div style={{ width: 42, height: 42, borderRadius: 'var(--radius-md)', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.75rem' }}>
              <Scan size={22} color="var(--accent-emerald)" />
            </div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.3rem' }}>
              {t.navScan}
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Capture front and back labels via camera or upload images for local-first OCR text analysis.
            </p>
          </div>

          <div
            onClick={() => onNavigate('calculator')}
            className="glass-card interactive"
            style={{ cursor: 'pointer' }}
          >
            <div style={{ width: 42, height: 42, borderRadius: 'var(--radius-md)', background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.75rem' }}>
              <Calculator size={22} color="#f59e0b" />
            </div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.3rem' }}>
              {t.navCalculator}
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Slide to any portion size and see instant calorie and macro recalculation with transparent formulas.
            </p>
          </div>

          <div
            onClick={() => onNavigate('compare')}
            className="glass-card interactive"
            style={{ cursor: 'pointer' }}
          >
            <div style={{ width: 42, height: 42, borderRadius: 'var(--radius-md)', background: 'rgba(6, 182, 212, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.75rem' }}>
              <GitCompare size={22} color="#06b6d4" />
            </div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.3rem' }}>
              {t.navCompare}
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Fair side-by-side comparison with unit normalization and objective consumer takeaways.
            </p>
          </div>

          <div
            onClick={() => onNavigate('food-log')}
            className="glass-card interactive"
            style={{ cursor: 'pointer' }}
          >
            <div style={{ width: 42, height: 42, borderRadius: 'var(--radius-md)', background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.75rem' }}>
              <CalendarDays size={22} color="#818cf8" />
            </div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.3rem' }}>
              {t.navFoodLog}
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Simple daily meal log calculating real calories consumed with date history.
            </p>
          </div>

          <div
            onClick={() => onNavigate('ingredients')}
            className="glass-card interactive"
            style={{ cursor: 'pointer' }}
          >
            <div style={{ width: 42, height: 42, borderRadius: 'var(--radius-md)', background: 'rgba(236, 72, 153, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.75rem' }}>
              <BookOpen size={22} color="#f472b6" />
            </div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.3rem' }}>
              {t.navIngredients}
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Curated local database explaining INS/E-numbers, emulsifiers, preservatives in English and Hindi.
            </p>
          </div>

          <div
            onClick={() => onNavigate('reminders')}
            className="glass-card interactive"
            style={{ cursor: 'pointer' }}
          >
            <div style={{ width: 42, height: 42, borderRadius: 'var(--radius-md)', background: 'rgba(244, 63, 94, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.75rem' }}>
              <BellRing size={22} color="#fb7185" />
            </div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.3rem' }}>
              {t.navReminders}
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Pantry tracker with expiry and best-before date alerts and remaining day countdowns.
            </p>
          </div>
        </div>
      </section>

      {/* Trust & Evidence Notice */}
      <section className="glass-card" style={{ padding: '1.25rem', background: 'rgba(15, 23, 42, 0.6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <ShieldCheck size={26} color="var(--accent-emerald)" />
          <div>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>
              Honest Data & Evidence Guarantee
            </h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              LabelLens never manufactures nutrition values to make result cards look complete. Every field clearly indicates whether it was read from packaging, calculated by formula, or is missing.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
