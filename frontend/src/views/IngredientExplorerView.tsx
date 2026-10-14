import React, { useState, useEffect } from 'react';
import { IngredientExplanation } from '../types';
import { api } from '../services/api';
import { useLanguage } from '../i18n';
import { Search, BookOpen, AlertTriangle, ShieldCheck, Sparkles, Filter } from 'lucide-react';

export const IngredientExplorerView: React.FC = () => {
  const { language, t } = useLanguage();
  const [ingredients, setIngredients] = useState<IngredientExplanation[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState<boolean>(true);

  // Unfamiliar search AI fallback test
  const [unfamiliarQuery, setUnfamiliarQuery] = useState<string>('');
  const [aiResult, setAiResult] = useState<any | null>(null);
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);

  useEffect(() => {
    api.searchIngredients(searchQuery)
      .then((res) => {
        setIngredients(res);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [searchQuery]);

  const categories = ['all', 'Emulsifier', 'Preservative', 'Sweetener', 'Flavor Enhancer', 'Acidity Regulator', 'Leavening Agent', 'Food Color'];

  const filtered = selectedCategory === 'all'
    ? ingredients
    : ingredients.filter((i) => i.category.toLowerCase().includes(selectedCategory.toLowerCase()));

  const handleTestAiFallback = async () => {
    if (!unfamiliarQuery.trim()) return;
    setIsAiLoading(true);
    setAiResult(null);
    try {
      // Calls POST /api/ingredients/explain-ai
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/ingredients/explain-ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredient_name: unfamiliarQuery, language }),
      });
      const data = await res.json();
      setAiResult(data);
    } catch (e: any) {
      setAiResult({
        name: unfamiliarQuery,
        explanation_en: 'Explanation not available yet in local database.',
        explanation_hi: 'स्थानीय डेटाबेस में विवरण अभी उपलब्ध नहीं है।',
        source: 'Local Fallback',
        ai_used: false,
      });
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="fade-in">
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.85rem', fontWeight: 800, marginBottom: '0.35rem' }}>
          {t.ingredientsTitle}
        </h1>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          {t.ingredientsSubtitle} Curated local database with verified functions and plain English & Hindi translations.
        </p>
      </div>

      {/* Search Input & Category Pills */}
      <div className="glass-card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
        <div style={{ position: 'relative', marginBottom: '1rem' }}>
          <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name (e.g. Lecithin, MSG), INS code (e.g. 500, 322), or category..."
            className="form-input"
            style={{ paddingLeft: '2.5rem', fontSize: '0.95rem' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`btn btn-sm ${selectedCategory === cat ? 'btn-primary' : 'btn-secondary'}`}
              style={{ borderRadius: 'var(--radius-full)', fontSize: '0.75rem', textTransform: 'capitalize' }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* List of Ingredients */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
        {filtered.map((item, idx) => (
          <div key={idx} className="glass-card">
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {item.name}
                  {item.code && (
                    <span style={{ color: 'var(--accent-emerald-light)', fontSize: '0.9rem', marginLeft: '0.5rem' }}>
                      [{item.code}]
                    </span>
                  )}
                </h3>
              </div>
              <span className="badge badge-source">{item.category}</span>
            </div>

            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.6rem' }}>
              <strong>{t.functionLabel}:</strong> {item.function}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div style={{ background: 'var(--bg-surface)', padding: '0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.82rem', lineHeight: 1.5 }}>
                <strong style={{ color: 'var(--secondary)' }}>English Explanation:</strong>
                <p style={{ marginTop: '0.2rem' }}>{item.explanation_en}</p>
              </div>

              <div style={{ background: 'var(--bg-surface)', padding: '0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', lineHeight: 1.5 }}>
                <strong style={{ color: 'var(--primary)' }}>हिन्दी विवरण:</strong>
                <p style={{ marginTop: '0.2rem' }}>{item.explanation_hi}</p>
              </div>
            </div>

            {item.caution && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(185, 130, 53, 0.1)', border: '1px solid rgba(185, 130, 53, 0.25)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', color: 'var(--color-warning)', fontSize: '0.78rem', marginBottom: '0.5rem' }}>
                <AlertTriangle size={15} />
                <span><strong>{t.cautionLabel}:</strong> {item.caution}</span>
              </div>
            )}

            {item.source && (
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                <strong>{t.sourceLabel}:</strong> {item.source}
              </div>
            )}
          </div>
        ))}

        {filtered.length === 0 && !loading && (
          <div className="glass-card" style={{ textAlign: 'center', padding: '2rem' }}>
            <p style={{ color: 'var(--text-secondary)' }}>
              No ingredient found matching "{searchQuery}".
            </p>
          </div>
        )}
      </div>

      {/* Unfamiliar Ingredient Lookup Test */}
      <div className="glass-card" style={{ background: 'rgba(15, 23, 42, 0.6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <Sparkles size={18} color="var(--accent-amber)" />
          <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>
            Unfamiliar Ingredient Fallback Test
          </h3>
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
          Try looking up an ingredient not yet in the local database. Verifies graceful local fallback when generative AI is disabled:
        </p>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <input
            type="text"
            value={unfamiliarQuery}
            onChange={(e) => setUnfamiliarQuery(e.target.value)}
            placeholder="e.g. Astragalus polysaccharide, Spirulina Blue..."
            className="form-input"
            style={{ flex: 1, minWidth: '220px' }}
          />
          <button
            onClick={handleTestAiFallback}
            disabled={isAiLoading || !unfamiliarQuery.trim()}
            className="btn btn-secondary"
          >
            {isAiLoading ? 'Checking...' : 'Check Fallback'}
          </button>
        </div>

        {aiResult && (
          <div style={{ marginTop: '1rem', background: 'var(--bg-surface)', padding: '0.85rem', borderRadius: 'var(--radius-md)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
              <strong style={{ fontSize: '0.85rem' }}>{aiResult.name}</strong>
              <span className="badge badge-calc" style={{ fontSize: '0.7rem' }}>
                Source: {aiResult.source}
              </span>
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              {aiResult.explanation_en}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
