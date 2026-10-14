import React, { useState, useEffect } from 'react';
import { useLanguage } from '../i18n';
import {
  getUserAllergenPreferences,
  saveUserAllergenPreferences,
  DEFAULT_ALLERGEN_OPTIONS,
} from '../services/localStore';
import { Languages, ShieldAlert, Cpu, Sparkles, Check } from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { language, setLanguage, t } = useLanguage();
  const [allergens, setAllergens] = useState<string[]>([]);
  const [savedNotif, setSavedNotif] = useState<boolean>(false);

  useEffect(() => {
    setAllergens(getUserAllergenPreferences());
  }, []);

  const handleToggleAllergen = (item: string) => {
    const updated = allergens.includes(item)
      ? allergens.filter((a) => a !== item)
      : [...allergens, item];
    setAllergens(updated);
    saveUserAllergenPreferences(updated);
    setSavedNotif(true);
    setTimeout(() => setSavedNotif(false), 2000);
  };

  return (
    <div className="fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.85rem', fontWeight: 800, marginBottom: '0.35rem' }}>
          {t.settingsTitle}
        </h1>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          Manage your interface language and personal allergen safety preferences.
        </p>
      </div>

      {/* Language Selector */}
      <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <Languages size={18} color="var(--accent-emerald)" />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{t.selectLanguage}</h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <button
            onClick={() => setLanguage('en')}
            className={`btn ${language === 'en' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.85rem', display: 'flex', justifyContent: 'center', gap: '0.5rem' }}
          >
            {language === 'en' && <Check size={16} />}
            <span>English</span>
          </button>

          <button
            onClick={() => setLanguage('hi')}
            className={`btn ${language === 'hi' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.85rem', display: 'flex', justifyContent: 'center', gap: '0.5rem' }}
          >
            {language === 'hi' && <Check size={16} />}
            <span>हिन्दी (Hindi)</span>
          </button>
        </div>
      </div>

      {/* Allergen Concerns Checklist */}
      <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldAlert size={18} color="var(--accent-rose)" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{t.dietaryConcerns}</h3>
          </div>
          {savedNotif && (
            <span className="badge badge-source" style={{ fontSize: '0.7rem' }}>
              ✓ Preferences Saved
            </span>
          )}
        </div>

        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          {t.selectConcernsDesc}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.6rem' }}>
          {DEFAULT_ALLERGEN_OPTIONS.map((item) => {
            const isChecked = allergens.includes(item);
            return (
              <label
                key={item}
                onClick={() => handleToggleAllergen(item)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  padding: '0.65rem 0.85rem',
                  background: isChecked ? 'rgba(244, 63, 94, 0.15)' : 'var(--bg-surface)',
                  border: isChecked ? '1px solid rgba(244, 63, 94, 0.4)' : '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: isChecked ? 700 : 500,
                  color: isChecked ? '#fecdd3' : 'var(--text-primary)',
                  transition: 'all 0.15s ease',
                }}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  readOnly
                  style={{ accentColor: '#f43f5e' }}
                />
                <span>{item}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Local-First Architecture Guarantee */}
      <div className="glass-card" style={{ background: 'rgba(15, 23, 42, 0.6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <Cpu size={18} color="var(--accent-emerald)" />
          <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>{t.aiStatusTitle}</h3>
        </div>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          {t.aiStatusDesc} All OCR text recognition, portion recalculations, price per unit normalization, and allergen scanning are performed using deterministic code. No telemetry or images leave your machine.
        </p>
      </div>
    </div>
  );
};
