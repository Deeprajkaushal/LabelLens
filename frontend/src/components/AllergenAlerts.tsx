import React from 'react';
import { AlertTriangle, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { AllergenMatch } from '../types';
import { useLanguage } from '../i18n';

interface AllergenAlertsProps {
  allergens: AllergenMatch[];
  userPreferences?: string[];
}

export const AllergenAlerts: React.FC<AllergenAlertsProps> = ({
  allergens,
  userPreferences = [],
}) => {
  const { t } = useLanguage();

  if (!allergens || allergens.length === 0) {
    return (
      <div className="glass-card" style={{ padding: '1rem', borderLeft: '4px solid var(--accent-emerald)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--accent-emerald-light)' }}>
          <CheckCircle2 size={18} />
          <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{t.noAllergensDetected}</span>
        </div>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
          {t.allergenFreeDisclaimer}
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card" style={{ borderLeft: '4px solid var(--color-error)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertTriangle size={18} color="var(--color-error)" />
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-error)' }}>
            {t.allergenAlerts} ({allergens.length})
          </h3>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {allergens.map((match, idx) => {
          const isUserConcern = userPreferences.includes(match.allergen);
          return (
            <div
              key={idx}
              style={{
                background: isUserConcern ? 'rgba(181, 71, 71, 0.1)' : 'var(--bg-surface)',
                border: isUserConcern ? '1px solid rgba(181, 71, 71, 0.25)' : '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '0.6rem 0.85rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: isUserConcern ? 'var(--color-error)' : 'var(--text-primary)' }}>
                  {match.allergen}
                  {isUserConcern && (
                    <span className="badge badge-danger" style={{ marginLeft: '0.5rem', fontSize: '0.65rem' }}>
                      Marked in My Preferences
                    </span>
                  )}
                </span>
                <span className="badge badge-warning" style={{ fontSize: '0.68rem' }}>
                  {match.confidence}
                </span>
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                <strong>Evidence snippet:</strong> "{match.evidence_snippet}"
              </div>
            </div>
          );
        })}
      </div>

      <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
        {t.allergenFreeDisclaimer}
      </p>
    </div>
  );
};
