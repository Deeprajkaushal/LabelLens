import React, { useState, useEffect } from 'react';
import { FoodLogEntry, DailyFoodLogSummary } from '../types';
import { api } from '../services/api';
import { useLanguage } from '../i18n';
import { CalendarDays, Plus, Trash2, Edit3, Flame, Info } from 'lucide-react';

export const FoodLogView: React.FC = () => {
  const { t } = useLanguage();
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [summary, setSummary] = useState<DailyFoodLogSummary | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);

  // Form for manual entry
  const [entryName, setEntryName] = useState<string>('');
  const [mealType, setMealType] = useState<string>('Snack');
  const [portionSize, setPortionSize] = useState<number>(30);
  const [portionUnit, setPortionUnit] = useState<string>('g');
  const [calories, setCalories] = useState<number>(140);
  const [protein, setProtein] = useState<number>(2.5);
  const [carbs, setCarbs] = useState<number>(18.0);
  const [fat, setFat] = useState<number>(6.0);

  const fetchLog = () => {
    api.getDailyFoodLog(selectedDate)
      .then((res) => setSummary(res))
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    fetchLog();
  }, [selectedDate]);

  const handleAddEntry = async () => {
    if (!entryName.trim() || calories <= 0) return;
    try {
      await api.addFoodLogEntry({
        product_name: entryName,
        log_date: selectedDate,
        meal_type: mealType,
        portion_size: portionSize,
        portion_unit: portionUnit,
        calories_consumed: calories,
        protein_g: protein,
        carbs_g: carbs,
        fat_g: fat,
      });
      setIsAddModalOpen(false);
      setEntryName('');
      fetchLog();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    try {
      await api.deleteFoodLogEntry(id);
      fetchLog();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fade-in">
      {/* Header and Date Selector */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, marginBottom: '0.35rem' }}>
            {t.foodLogTitle}
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            {t.foodLogSubtitle}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'var(--bg-card)', padding: '0.4rem 0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-card)' }}>
            <CalendarDays size={16} color="var(--accent-emerald)" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none' }}
            />
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="btn btn-primary btn-sm"
          >
            <Plus size={16} />
            {t.addFoodEntry}
          </button>
        </div>
      </div>

      {/* Daily Summary Cards */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <div className="glass-card" style={{ padding: '1rem', borderLeft: '4px solid var(--primary)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{t.totalLoggedCalories}</div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--primary)' }}>
              {summary.total_calories} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>kcal</span>
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{summary.entries_count} logged item{summary.entries_count !== 1 ? 's' : ''}</div>
          </div>

          <div className="glass-card" style={{ padding: '1rem', borderLeft: '4px solid var(--secondary)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{t.protein}</div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--secondary)' }}>
              {summary.total_protein_g} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>g</span>
            </div>
          </div>

          <div className="glass-card" style={{ padding: '1rem', borderLeft: '4px solid var(--accent)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{t.carbohydrates}</div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--secondary)' }}>
              {summary.total_carbs_g} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>g</span>
            </div>
          </div>

          <div className="glass-card" style={{ padding: '1rem', borderLeft: '4px solid var(--color-warning)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{t.totalFat}</div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--color-warning)' }}>
              {summary.total_fat_g} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>g</span>
            </div>
          </div>

          <div className="glass-card" style={{ padding: '1rem', borderLeft: '4px solid var(--border-card)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{t.totalSugars}</div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {summary.total_sugar_g} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>g</span>
            </div>
          </div>
        </div>
      )}

      {/* Logged Entries List */}
      <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>
          Logged Meals for {selectedDate}
        </h3>

        {summary && summary.entries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
            <p>{t.noEntriesLogged}</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {summary?.entries.map((item) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.85rem 1rem',
                  background: 'var(--bg-surface)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{item.product_name}</span>
                    <span className="badge badge-source" style={{ fontSize: '0.68rem' }}>
                      {item.meal_type}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                    Portion: <strong>{item.portion_size} {item.portion_unit}</strong>
                    {item.protein_g !== undefined && ` | Protein: ${item.protein_g}g`}
                    {item.carbs_g !== undefined && ` | Carbs: ${item.carbs_g}g`}
                    {item.fat_g !== undefined && ` | Fat: ${item.fat_g}g`}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary)' }}>
                      {item.calories_consumed.toFixed(1)} kcal
                    </span>
                  </div>
                  <button
                    onClick={() => handleDeleteEntry(item.id)}
                    className="btn btn-danger btn-sm"
                    style={{ padding: '0.35rem 0.5rem' }}
                    title="Delete Entry"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Trust Notice */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', padding: '0.5rem' }}>
        <Info size={14} />
        <span>
          LabelLens provides honest mathematical tracking based on declared values. It does not provide medical dietary advice or prescribe mandatory calorie goals.
        </span>
      </div>

      {/* Add Entry Modal */}
      {isAddModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Log a Food Item</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="btn btn-secondary btn-sm">✕</button>
            </div>

            <div className="form-group">
              <label className="form-label">Food / Product Name</label>
              <input
                type="text"
                value={entryName}
                onChange={(e) => setEntryName(e.target.value)}
                placeholder="e.g. Marie Biscuits, Apple Juice, Oatmeal..."
                className="form-input"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">Meal Type</label>
                <select
                  value={mealType}
                  onChange={(e) => setMealType(e.target.value)}
                  className="form-select"
                >
                  <option value="Breakfast">Breakfast</option>
                  <option value="Lunch">Lunch</option>
                  <option value="Dinner">Dinner</option>
                  <option value="Snack">Snack</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Portion Size ({portionUnit})</label>
                <input
                  type="number"
                  value={portionSize}
                  onChange={(e) => setPortionSize(parseFloat(e.target.value) || 0)}
                  className="form-input"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">Calories Consumed (kcal)</label>
                <input
                  type="number"
                  value={calories}
                  onChange={(e) => setCalories(parseFloat(e.target.value) || 0)}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Protein (g)</label>
                <input
                  type="number"
                  step="0.5"
                  value={protein}
                  onChange={(e) => setProtein(parseFloat(e.target.value) || 0)}
                  className="form-input"
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
              <button onClick={() => setIsAddModalOpen(false)} className="btn btn-secondary">
                {t.cancel}
              </button>
              <button onClick={handleAddEntry} className="btn btn-primary">
                Add to Daily Log
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
