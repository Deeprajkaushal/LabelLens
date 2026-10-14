import React from 'react';
import { CheckCircle2, AlertCircle, HelpCircle, ShieldAlert } from 'lucide-react';
import { DeclarationCheckItem } from '../types';

interface DeclarationChecklistProps {
  items: DeclarationCheckItem[];
}

export const DeclarationChecklist: React.FC<DeclarationChecklistProps> = ({ items }) => {
  if (!items || items.length === 0) return null;

  const declaredCount = items.filter((i) => i.is_present).length;

  return (
    <div className="glass-card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>
            Mandatory Declarations Checklist
          </h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Supporting Legal Metrology (Packaged Commodities) & FSSAI consumer guidance.
          </p>
        </div>
        <span className="badge badge-source">
          {declaredCount} / {items.length} Detected
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {items.map((item, idx) => (
          <div
            key={idx}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem',
              padding: '0.65rem 0.85rem',
              background: 'var(--bg-surface)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ marginTop: '0.15rem' }}>
              {item.is_present ? (
                <CheckCircle2 size={18} color="var(--accent-emerald)" />
              ) : (
                <AlertCircle size={18} color="var(--accent-amber)" />
              )}
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{item.label_text}</span>
                <span
                  className={`badge ${item.is_present ? 'badge-source' : 'badge-warning'}`}
                  style={{ fontSize: '0.65rem' }}
                >
                  {item.status}
                </span>
              </div>

              {item.is_present && item.detected_value && (
                <div style={{ fontSize: '0.8rem', color: 'var(--accent-emerald-light)', marginTop: '0.15rem' }}>
                  Value: <strong>{item.detected_value}</strong>
                </div>
              )}

              {!item.is_present && (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                  {item.guidance}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: '0.75rem', fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <HelpCircle size={14} />
        <span>
          Consumer Note: Automated text scan does not replace an authorized inspection. Absence on OCR may be due to lighting or fold in packaging.
        </span>
      </div>
    </div>
  );
};
