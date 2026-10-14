import React, { useState, useEffect } from 'react';
import { Flame, PlusCircle, Check } from 'lucide-react';
import { Product, PortionCalculationResponse } from '../types';
import { api } from '../services/api';
import { useLanguage } from '../i18n';

interface PortionSliderProps {
  product: Product;
  onLogMeal?: (portion: number, unit: string, calories: number) => void;
}

export const PortionSlider: React.FC<PortionSliderProps> = ({ product, onLogMeal }) => {
  const { t } = useLanguage();
  const defaultPortion = product.serving_size || (product.net_quantity_value && product.net_quantity_value <= 50 ? product.net_quantity_value : 30);
  const unit = product.serving_unit || product.net_quantity_unit || 'g';

  const [portion, setPortion] = useState<number>(defaultPortion);
  const [calcResult, setCalcResult] = useState<PortionCalculationResponse | null>(null);
  const [logged, setLogged] = useState<boolean>(false);

  const basisKcal = product.energy_kcal || 0;
  const maxSlider = Math.max(150, (product.net_quantity_value || 100) * 1.5);

  useEffect(() => {
    if (!basisKcal || portion <= 0) return;

    // Recalculate locally immediately or via API
    const ratio = portion / 100.0;
    const directKcal = Math.round(basisKcal * ratio * 10) / 10;

    api.calculatePortion({
      energy_kcal_basis: basisKcal,
      basis: product.nutrition_basis || 'per 100g',
      portion_size: portion,
      portion_unit: unit,
      protein_g: product.protein_g,
      carbohydrates_g: product.carbohydrates_g,
      total_sugar_g: product.total_sugar_g,
      total_fat_g: product.total_fat_g,
      saturated_fat_g: product.saturated_fat_g,
      sodium_mg: product.sodium_mg,
      fibre_g: product.fibre_g,
    })
      .then((res) => setCalcResult(res))
      .catch(() => {
        // Local calculation fallback
        setCalcResult({
          portion_size: portion,
          portion_unit: unit,
          energy_kcal: directKcal,
          formula_used: `${basisKcal} kcal × ${portion} ${unit} ÷ 100 = ${directKcal} kcal`,
          nutrients: [],
          is_compatible: true,
        });
      });
  }, [portion, basisKcal, unit, product]);

  const handlePreset = (val: number) => {
    setPortion(val);
    setLogged(false);
  };

  const handleLogClick = () => {
    if (calcResult && onLogMeal) {
      onLogMeal(portion, unit, calcResult.energy_kcal);
      setLogged(true);
      setTimeout(() => setLogged(false), 2500);
    }
  };

  if (!basisKcal) {
    return (
      <div className="glass-card" style={{ padding: '1rem' }}>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Energy (calories) is missing for this product. Edit the product to add energy per 100g/ml to enable the calorie calculator.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(36, 91, 74, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Flame size={20} color="var(--primary)" />
          </div>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>{t.calculatePortion}</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Package energy: {basisKcal} kcal {product.nutrition_basis || 'per 100g'}
            </span>
          </div>
        </div>

        {calcResult && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)', lineHeight: 1 }}>
              {calcResult.energy_kcal.toFixed(1)} <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>kcal</span>
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>in {portion} {unit}</span>
          </div>
        )}
      </div>

      {/* Slider Controls */}
      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            {t.portionEaten}:
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <input
              type="number"
              min="1"
              max="2000"
              value={portion}
              onChange={(e) => {
                const v = parseFloat(e.target.value) || 1;
                setPortion(v);
                setLogged(false);
              }}
              className="form-input"
              style={{ width: '80px', padding: '0.25rem 0.5rem', textAlign: 'center', fontWeight: 700 }}
            />
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{unit}</span>
          </div>
        </div>

        <input
          type="range"
          min="5"
          max={maxSlider}
          step="5"
          value={portion}
          onChange={(e) => {
            setPortion(parseFloat(e.target.value));
            setLogged(false);
          }}
          className="slider-input"
        />

        {/* Quick Presets */}
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', alignSelf: 'center' }}>Presets:</span>
          {product.serving_size && (
            <button
              onClick={() => handlePreset(product.serving_size!)}
              className="btn btn-secondary btn-sm"
              style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem' }}
            >
              1 Serving ({product.serving_size}{unit})
            </button>
          )}
          <button
            onClick={() => handlePreset(30)}
            className="btn btn-secondary btn-sm"
            style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem' }}
          >
            30{unit}
          </button>
          <button
            onClick={() => handlePreset(50)}
            className="btn btn-secondary btn-sm"
            style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem' }}
          >
            50{unit}
          </button>
          <button
            onClick={() => handlePreset(100)}
            className="btn btn-secondary btn-sm"
            style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem' }}
          >
            100{unit}
          </button>
          {product.net_quantity_value && (
            <button
              onClick={() => handlePreset(product.net_quantity_value!)}
              className="btn btn-secondary btn-sm"
              style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem' }}
            >
              Whole Pack ({product.net_quantity_value}{unit})
            </button>
          )}
        </div>
      </div>

      {/* Calculated Macronutrients Breakdown */}
      {calcResult && calcResult.nutrients && calcResult.nutrients.length > 0 && (
        <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', padding: '0.85rem', marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
            Nutrients for {portion} {unit}:
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '0.5rem' }}>
            {calcResult.nutrients.map((n, idx) => (
              <div key={idx} style={{ background: 'var(--bg-card)', padding: '0.4rem 0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{n.nutrient_name}</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {n.portion_value} {n.unit}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Formula & Action */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-subtle)' }}>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          <strong>Formula:</strong> {calcResult?.formula_used}
        </div>

        {onLogMeal && (
          <button
            onClick={handleLogClick}
            disabled={logged}
            className={`btn ${logged ? 'btn-secondary' : 'btn-primary'} btn-sm`}
          >
            {logged ? (
              <>
                <Check size={14} color="var(--primary)" />
                Added to Log!
              </>
            ) : (
              <>
                <PlusCircle size={14} />
                Log to Food Log
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};
