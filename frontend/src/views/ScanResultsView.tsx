import React, { useState } from 'react';
import {
  Product,
  AnalyzeLabelResponse,
  FieldEvidence,
  IngredientExplanation,
  AllergenMatch
} from '../types';
import { PortionSlider } from '../components/PortionSlider';
import { ValueCard } from '../components/ValueCard';
import { AllergenAlerts } from '../components/AllergenAlerts';
import { DeclarationChecklist } from '../components/DeclarationChecklist';
import { EvidenceBadge } from '../components/EvidenceBadge';
import { api } from '../services/api';
import { useLanguage } from '../i18n';
import {
  Bookmark,
  Check,
  Edit3,
  GitCompare,
  Flame,
  Info,
  Calendar,
  Building,
  ShieldCheck,
  Tag,
  ArrowLeft
} from 'lucide-react';

interface ScanResultsViewProps {
  data: AnalyzeLabelResponse | { product: Product };
  onNavigate: (view: string, params?: any) => void;
  onProductSaved?: (product: Product) => void;
}

export const ScanResultsView: React.FC<ScanResultsViewProps> = ({
  data,
  onNavigate,
  onProductSaved,
}) => {
  const { t } = useLanguage();
  const initialProduct = 'product' in data ? data.product : (data as any);
  const [product, setProduct] = useState<Product>(initialProduct);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'nutrition' | 'ingredients' | 'evidence' | 'checklist'>('overview');

  // Edit form state
  const [editForm, setEditForm] = useState<Partial<Product>>({ ...initialProduct });

  const evidences: FieldEvidence[] = 'evidences' in data ? (data as AnalyzeLabelResponse).evidences : [];
  const allergens: AllergenMatch[] = product.allergens_detected || [];
  const ingredientsExplained: IngredientExplanation[] = 'ingredients_explained' in data ? (data as AnalyzeLabelResponse).ingredients_explained : [];
  const checklist = 'declarations_checklist' in data ? (data as AnalyzeLabelResponse).declarations_checklist : [];

  const handleSaveProduct = async () => {
    setIsSaving(true);
    try {
      const saved = await api.createProduct(product);
      setProduct(saved);
      setIsSaved(true);
      onProductSaved?.(saved);
    } catch (err: any) {
      console.warn('Could not save to remote SQLite, stored in local state:', err);
      setIsSaved(true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogMeal = async (portion: number, unit: string, calories: number) => {
    try {
      await api.addFoodLogEntry({
        product_id: product.id,
        product_name: product.name,
        log_date: new Date().toISOString().split('T')[0],
        meal_type: 'Snack',
        portion_size: portion,
        portion_unit: unit,
        calories_consumed: calories,
        protein_g: product.protein_g ? (product.protein_g * portion) / 100 : undefined,
        carbs_g: product.carbohydrates_g ? (product.carbohydrates_g * portion) / 100 : undefined,
        fat_g: product.total_fat_g ? (product.total_fat_g * portion) / 100 : undefined,
        sugar_g: product.total_sugar_g ? (product.total_sugar_g * portion) / 100 : undefined,
        sodium_mg: product.sodium_mg ? (product.sodium_mg * portion) / 100 : undefined,
      });
      alert(`Logged ${portion}${unit} of "${product.name}" (${calories} kcal) to today's food log!`);
    } catch (err) {
      console.error('Failed to log meal:', err);
    }
  };

  const handleApplyEdits = () => {
    const updated = { ...product, ...editForm, data_source: 'User Verified / Corrected' };
    setProduct(updated);
    setIsEditModalOpen(false);
  };

  return (
    <div className="fade-in">
      {/* Top Bar Navigation & Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <button
          onClick={() => onNavigate('scan')}
          className="btn btn-secondary btn-sm"
        >
          <ArrowLeft size={16} />
          Back to Scanner
        </button>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="btn btn-secondary btn-sm"
          >
            <Edit3 size={15} />
            Edit Values
          </button>

          <button
            onClick={() => onNavigate('compare', { productA: product })}
            className="btn btn-secondary btn-sm"
          >
            <GitCompare size={15} color="#38bdf8" />
            Compare This
          </button>

          <button
            onClick={handleSaveProduct}
            disabled={isSaved || isSaving}
            className={`btn ${isSaved ? 'btn-secondary' : 'btn-primary'} btn-sm`}
          >
            {isSaved ? (
              <>
                <Check size={15} color="var(--accent-emerald)" />
                {t.saved}
              </>
            ) : (
              <>
                <Bookmark size={15} />
                {t.saveProduct}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Product Hero Title Header */}
      <div className="glass-card" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <span className="badge badge-source">{product.category || 'Food Product'}</span>
              {product.brand && (
                <span className="badge badge-calc" style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--text-secondary)' }}>
                  Brand: {product.brand}
                </span>
              )}
              <EvidenceBadge source={product.data_source || 'Read from Package'} confidence="High" />
            </div>

            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.35rem' }}>
              {product.name}
            </h1>

            <div style={{ display: 'flex', gap: '1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
              {product.net_quantity_value && (
                <span>
                  Net Qty: <strong>{product.net_quantity_value} {product.net_quantity_unit}</strong>
                </span>
              )}
              {product.mrp && (
                <span>
                  MRP: <strong>₹{product.mrp.toFixed(2)}</strong> (All Incl.)
                </span>
              )}
              {product.expiry_date && (
                <span>
                  Expiry: <strong>{product.expiry_date}</strong>
                </span>
              )}
              {product.best_before_text && (
                <span>
                  <strong>{product.best_before_text}</strong>
                </span>
              )}
            </div>
          </div>

          {product.energy_kcal && (
            <div style={{ textAlign: 'right', background: 'rgba(15, 23, 42, 0.7)', padding: '0.75rem 1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Energy / Calories</div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#f59e0b', lineHeight: 1 }}>
                {product.energy_kcal} <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>kcal</span>
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{product.nutrition_basis || 'per 100g'}</div>
            </div>
          )}
        </div>
      </div>

      {/* View Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
        {[
          { id: 'overview', label: 'Overview & Calories' },
          { id: 'nutrition', label: 'Nutrition Table' },
          { id: 'ingredients', label: `Ingredients (${ingredientsExplained.length})` },
          { id: 'evidence', label: `Evidence Panel (${evidences.length})` },
          { id: 'checklist', label: 'Packaging Checklist' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`btn btn-sm ${activeTab === tab.id ? 'btn-primary' : 'btn-secondary'}`}
            style={{ borderRadius: 'var(--radius-full)', whiteSpace: 'nowrap' }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: Overview & Portion Calculator */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Smart Calorie Calculator */}
          <PortionSlider product={product} onLogMeal={handleLogMeal} />

          {/* Unit Price & Value Checker */}
          <ValueCard
            mrp={product.mrp}
            netQtyValue={product.net_quantity_value}
            netQtyUnit={product.net_quantity_unit}
            pricePerStandardUnit={product.price_per_standard_unit}
            standardUnit={product.standard_unit}
          />

          {/* Allergen Alerts */}
          <AllergenAlerts allergens={allergens} />
        </div>
      )}

      {/* TAB 2: Full Nutritional Facts Table */}
      {activeTab === 'nutrition' && (
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>
              Nutritional Facts ({product.nutrition_basis || 'per 100g'})
            </h3>
            <span className="badge badge-source">Standard Declaration</span>
          </div>

          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Nutrient</th>
                  <th>Amount</th>
                  <th>Source & Status</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { name: 'Energy (Calories)', val: product.energy_kcal ? `${product.energy_kcal} kcal` : null },
                  { name: 'Protein', val: product.protein_g ? `${product.protein_g} g` : null },
                  { name: 'Carbohydrates', val: product.carbohydrates_g ? `${product.carbohydrates_g} g` : null },
                  { name: 'Total Sugars', val: product.total_sugar_g ? `${product.total_sugar_g} g` : null },
                  { name: 'Added Sugars', val: product.added_sugar_g ? `${product.added_sugar_g} g` : null },
                  { name: 'Total Fat', val: product.total_fat_g ? `${product.total_fat_g} g` : null },
                  { name: 'Saturated Fat', val: product.saturated_fat_g ? `${product.saturated_fat_g} g` : null },
                  { name: 'Trans Fat', val: product.trans_fat_g !== undefined ? `${product.trans_fat_g} g` : null },
                  { name: 'Dietary Fibre', val: product.fibre_g ? `${product.fibre_g} g` : null },
                  { name: 'Sodium', val: product.sodium_mg ? `${product.sodium_mg} mg` : null },
                ].map((row, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 600 }}>{row.name}</td>
                    <td style={{ fontWeight: 700, color: row.val ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                      {row.val || 'Not declared / Missing'}
                    </td>
                    <td>
                      <EvidenceBadge
                        source={row.val ? 'Read from Package' : 'Missing / Unknown'}
                        confidence={row.val ? 'High' : 'Missing'}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Ingredients & Additives Explainer */}
      {activeTab === 'ingredients' && (
        <div className="glass-card">
          <div style={{ marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.25rem' }}>
              Full Ingredients Statement
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', background: 'var(--bg-surface)', padding: '0.75rem', borderRadius: 'var(--radius-md)', lineHeight: 1.6 }}>
              {product.ingredients_raw || 'No raw ingredients list could be detected on this label section.'}
            </p>
          </div>

          <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem' }}>
            Detected Food Additives & Key Ingredients Explained ({ingredientsExplained.length})
          </h4>

          {ingredientsExplained.length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              No additives with matching INS/E-numbers were detected in the local database.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {ingredientsExplained.map((ing, idx) => (
                <div
                  key={idx}
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.85rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                      {ing.name} {ing.code && <span style={{ color: 'var(--accent-emerald-light)', fontSize: '0.85rem' }}>({ing.code})</span>}
                    </div>
                    <span className="badge badge-calc">{ing.category}</span>
                  </div>

                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                    <strong>Function:</strong> {ing.function}
                  </div>

                  <div style={{ fontSize: '0.82rem', color: 'var(--text-primary)', marginBottom: '0.35rem', lineHeight: 1.5 }}>
                    <strong>English:</strong> {ing.explanation_en}
                  </div>

                  <div style={{ fontSize: '0.82rem', color: '#a7f3d0', marginBottom: '0.4rem', lineHeight: 1.5 }}>
                    <strong>हिन्दी:</strong> {ing.explanation_hi}
                  </div>

                  {ing.caution && (
                    <div style={{ fontSize: '0.75rem', color: '#fcd34d', background: 'rgba(245, 158, 11, 0.1)', padding: '0.35rem 0.6rem', borderRadius: 'var(--radius-sm)' }}>
                      ⚠️ {ing.caution}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: Evidence & Trust Panel */}
      {activeTab === 'evidence' && (
        <div className="glass-card">
          <div style={{ marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.25rem' }}>
              Field Provenance & Audit Trail
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Transparency guarantee: See verbatim OCR snippets for every extracted property.
            </p>
          </div>

          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Field</th>
                  <th>Value</th>
                  <th>Data Source</th>
                  <th>Recognized OCR Snippet</th>
                  <th>Confidence</th>
                </tr>
              </thead>
              <tbody>
                {evidences.map((ev, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 600 }}>{ev.field_name}</td>
                    <td style={{ fontWeight: 700 }}>{ev.value !== null && ev.value !== undefined ? String(ev.value) : '—'}</td>
                    <td>
                      <EvidenceBadge source={ev.source} confidence={ev.confidence} />
                    </td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', maxWidth: '280px', wordBreak: 'break-word' }}>
                      {ev.raw_snippet ? `"${ev.raw_snippet}"` : '—'}
                    </td>
                    <td>
                      <span className={`badge ${ev.confidence === 'High' ? 'badge-source' : 'badge-warning'}`}>
                        {ev.confidence}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: Packaging Checklist */}
      {activeTab === 'checklist' && (
        <DeclarationChecklist items={checklist} />
      )}

      {/* EDIT MODAL */}
      {isEditModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Edit Product Values</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="btn btn-secondary btn-sm">✕</button>
            </div>

            <div className="form-group">
              <label className="form-label">Product Name</label>
              <input
                type="text"
                value={editForm.name || ''}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="form-input"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">MRP (₹)</label>
                <input
                  type="number"
                  step="0.5"
                  value={editForm.mrp || ''}
                  onChange={(e) => setEditForm({ ...editForm, mrp: parseFloat(e.target.value) || undefined })}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Net Qty Value</label>
                <input
                  type="number"
                  value={editForm.net_quantity_value || ''}
                  onChange={(e) => setEditForm({ ...editForm, net_quantity_value: parseFloat(e.target.value) || undefined })}
                  className="form-input"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">Net Qty Unit (g, ml, kg, L)</label>
                <input
                  type="text"
                  value={editForm.net_quantity_unit || 'g'}
                  onChange={(e) => setEditForm({ ...editForm, net_quantity_unit: e.target.value })}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Energy (kcal per 100g/ml)</label>
                <input
                  type="number"
                  value={editForm.energy_kcal || ''}
                  onChange={(e) => setEditForm({ ...editForm, energy_kcal: parseFloat(e.target.value) || undefined })}
                  className="form-input"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">Protein (g)</label>
                <input
                  type="number"
                  step="0.1"
                  value={editForm.protein_g || ''}
                  onChange={(e) => setEditForm({ ...editForm, protein_g: parseFloat(e.target.value) || undefined })}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Total Sugars (g)</label>
                <input
                  type="number"
                  step="0.1"
                  value={editForm.total_sugar_g || ''}
                  onChange={(e) => setEditForm({ ...editForm, total_sugar_g: parseFloat(e.target.value) || undefined })}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Total Fat (g)</label>
                <input
                  type="number"
                  step="0.1"
                  value={editForm.total_fat_g || ''}
                  onChange={(e) => setEditForm({ ...editForm, total_fat_g: parseFloat(e.target.value) || undefined })}
                  className="form-input"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Expiry / Best Before Date (YYYY-MM-DD)</label>
              <input
                type="text"
                value={editForm.expiry_date || ''}
                onChange={(e) => setEditForm({ ...editForm, expiry_date: e.target.value })}
                placeholder="2027-02-15"
                className="form-input"
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
              <button onClick={() => setIsEditModalOpen(false)} className="btn btn-secondary">
                {t.cancel}
              </button>
              <button onClick={handleApplyEdits} className="btn btn-primary">
                {t.saveChanges}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
