import React, { useState, useEffect } from 'react';
import { Product } from '../types';
import { PortionSlider } from '../components/PortionSlider';
import { api } from '../services/api';
import { useLanguage } from '../i18n';
import { Calculator, Sparkles, PlusCircle } from 'lucide-react';

interface NutritionCalcViewProps {
  initialProduct?: Product;
  onNavigate: (view: string) => void;
}

export const NutritionCalcView: React.FC<NutritionCalcViewProps> = ({
  initialProduct,
  onNavigate,
}) => {
  const { t } = useLanguage();
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(initialProduct || null);

  // Custom manual calculation fields
  const [customName, setCustomName] = useState<string>('Custom Food Item');
  const [customKcal, setCustomKcal] = useState<number>(400);
  const [customUnit, setCustomUnit] = useState<string>('g');
  const [customServing, setCustomServing] = useState<number>(30);
  const [customProtein, setCustomProtein] = useState<number>(10);
  const [customSugar, setCustomSugar] = useState<number>(15);
  const [customFat, setCustomFat] = useState<number>(12);

  useEffect(() => {
    Promise.all([
      api.getDemoProducts().catch(() => []),
      api.getProducts().catch(() => []),
    ]).then(([demos, saved]) => {
      const combined = [...demos, ...saved];
      // deduplicate
      const unique = Array.from(new Map(combined.map((item) => [item.id, item])).values());
      setAvailableProducts(unique);
      if (!selectedProduct && unique.length > 0) {
        setSelectedProduct(unique[0]);
      }
    });
  }, []);

  const handleSelectProductChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    if (id === 'custom') {
      setSelectedProduct(null);
    } else {
      const match = availableProducts.find((p) => p.id === id);
      if (match) setSelectedProduct(match);
    }
  };

  const currentProductToCalculate: Product = selectedProduct || {
    id: 'custom-temp',
    name: customName,
    energy_kcal: customKcal,
    serving_size: customServing,
    serving_unit: customUnit,
    nutrition_basis: `per 100${customUnit}`,
    protein_g: customProtein,
    total_sugar_g: customSugar,
    total_fat_g: customFat,
    allergens_detected: [],
  };

  const handleLogMeal = async (portion: number, unit: string, calories: number) => {
    try {
      await api.addFoodLogEntry({
        product_id: currentProductToCalculate.id,
        product_name: currentProductToCalculate.name,
        log_date: new Date().toISOString().split('T')[0],
        meal_type: 'Snack',
        portion_size: portion,
        portion_unit: unit,
        calories_consumed: calories,
        protein_g: currentProductToCalculate.protein_g
          ? (currentProductToCalculate.protein_g * portion) / 100
          : undefined,
        fat_g: currentProductToCalculate.total_fat_g
          ? (currentProductToCalculate.total_fat_g * portion) / 100
          : undefined,
      });
      alert(`Logged ${portion}${unit} of "${currentProductToCalculate.name}" (${calories} kcal) to Food Log!`);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fade-in">
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.85rem', fontWeight: 800, marginBottom: '0.35rem' }}>
          {t.navCalculator}
        </h1>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          Transparent calorie & nutrition math. Calculate exact energy and macronutrients for any portion size using formula:
          <code style={{ background: 'var(--bg-surface)', padding: '0.2rem 0.4rem', borderRadius: '4px', marginLeft: '6px' }}>
            Calories = (kcal per 100g) × portion ÷ 100
          </code>
        </p>
      </div>

      {/* Product Selector Dropdown */}
      <div className="glass-card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
        <label className="form-label" style={{ marginBottom: '0.4rem' }}>
          Select Product to Calculate:
        </label>
        <select
          value={selectedProduct ? selectedProduct.id : 'custom'}
          onChange={handleSelectProductChange}
          className="form-select"
          style={{ fontSize: '1rem', fontWeight: 600 }}
        >
          {availableProducts.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} {p.brand ? `(${p.brand})` : ''} — {p.energy_kcal} kcal / 100{p.net_quantity_unit || 'g'}
            </option>
          ))}
          <option value="custom">✍️ Enter Custom Product Values Manually</option>
        </select>
      </div>

      {/* Manual Input Fields if Custom */}
      {!selectedProduct && (
        <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem' }}>
            Custom Product Details
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
            <div className="form-group">
              <label className="form-label">Food Name</label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Energy (kcal/100g)</label>
              <input
                type="number"
                value={customKcal}
                onChange={(e) => setCustomKcal(parseFloat(e.target.value) || 0)}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Unit (g / ml)</label>
              <input
                type="text"
                value={customUnit}
                onChange={(e) => setCustomUnit(e.target.value)}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Protein (g/100g)</label>
              <input
                type="number"
                step="0.5"
                value={customProtein}
                onChange={(e) => setCustomProtein(parseFloat(e.target.value) || 0)}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Total Sugar (g/100g)</label>
              <input
                type="number"
                step="0.5"
                value={customSugar}
                onChange={(e) => setCustomSugar(parseFloat(e.target.value) || 0)}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Total Fat (g/100g)</label>
              <input
                type="number"
                step="0.5"
                value={customFat}
                onChange={(e) => setCustomFat(parseFloat(e.target.value) || 0)}
                className="form-input"
              />
            </div>
          </div>
        </div>
      )}

      {/* The Portion Slider Component */}
      <PortionSlider
        product={currentProductToCalculate}
        onLogMeal={handleLogMeal}
      />
    </div>
  );
};
