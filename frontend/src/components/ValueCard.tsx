import React from 'react';
import { Tag, TrendingUp, Info } from 'lucide-react';
import { useLanguage } from '../i18n';

interface ValueCardProps {
  mrp?: number;
  netQtyValue?: number;
  netQtyUnit?: string;
  pricePerStandardUnit?: number;
  standardUnit?: string;
}

export const ValueCard: React.FC<ValueCardProps> = ({
  mrp,
  netQtyValue,
  netQtyUnit,
  pricePerStandardUnit,
  standardUnit,
}) => {
  const { t } = useLanguage();

  if (!mrp || !netQtyValue || !netQtyUnit) {
    return (
      <div className="glass-card" style={{ padding: '1rem', background: 'var(--bg-surface)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
          <Info size={16} />
          <span style={{ fontSize: '0.85rem' }}>
            Enter both MRP and Net Quantity to view unit prices and value-for-money.
          </span>
        </div>
      </div>
    );
  }

  const isLiquid = ['ml', 'l', 'ltr', 'litre'].includes(netQtyUnit.toLowerCase());
  const baseQty = ['kg', 'l', 'ltr', 'litre'].includes(netQtyUnit.toLowerCase())
    ? netQtyValue * 1000
    : netQtyValue;

  const baseUnit = isLiquid ? 'ml' : 'g';
  const unit100 = isLiquid ? '100 ml' : '100 g';
  const unitBulk = isLiquid ? '1 L' : '1 kg';

  const price100 = pricePerStandardUnit || Math.round((mrp / baseQty) * 100 * 100) / 100;
  const priceBulk = Math.round((mrp / baseQty) * 1000 * 100) / 100;

  return (
    <div className="glass-card" style={{ borderLeft: '4px solid var(--primary)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Tag size={18} color="var(--primary)" />
          <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>{t.unitPrice}</h3>
        </div>
        <span className="badge badge-calc">{t.calculated}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
        <div style={{ background: 'var(--bg-surface)', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            {isLiquid ? t.pricePer100ml : t.pricePer100g}
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)' }}>
            ₹{price100.toFixed(2)}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>per {unit100}</div>
        </div>

        <div style={{ background: 'var(--bg-surface)', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            {isLiquid ? t.pricePerLitre : t.pricePerKg}
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--secondary)' }}>
            ₹{priceBulk.toFixed(2)}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>per {unitBulk}</div>
        </div>
      </div>

      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'var(--bg-surface)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)' }}>
        <strong>Formula:</strong> ₹{mrp.toFixed(2)} ÷ {baseQty} {baseUnit} × 100 = ₹{price100.toFixed(2)} / {unit100}
      </div>
    </div>
  );
};
