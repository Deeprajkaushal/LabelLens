import React, { useState, useEffect } from 'react';
import { Reminder } from '../types';
import { api } from '../services/api';
import { useLanguage } from '../i18n';
import { BellRing, Plus, Trash2, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';

export const RemindersView: React.FC = () => {
  const { t } = useLanguage();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Form fields
  const [prodName, setProdName] = useState<string>('');
  const [expiryDate, setExpiryDate] = useState<string>('');
  const [remType, setRemType] = useState<string>('Expiry');
  const [notes, setNotes] = useState<string>('');

  const fetchReminders = () => {
    api.getReminders()
      .then((res) => setReminders(res))
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    fetchReminders();
  }, []);

  const handleCreateReminder = async () => {
    if (!prodName.trim() || !expiryDate.trim()) return;
    try {
      await api.createReminder({
        product_name: prodName,
        expiry_date: expiryDate,
        reminder_date: expiryDate,
        reminder_type: remType,
        notes: notes,
      });
      setIsModalOpen(false);
      setProdName('');
      setExpiryDate('');
      setNotes('');
      fetchReminders();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleStatus = async (rem: Reminder) => {
    const newStatus = rem.status === 'Active' ? 'Dismissed' : 'Active';
    try {
      await api.updateReminder(rem.id, { status: newStatus });
      fetchReminders();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteReminder(id);
      fetchReminders();
    } catch (err) {
      console.error(err);
    }
  };

  const activeList = reminders.filter((r) => r.status === 'Active');
  const dismissedList = reminders.filter((r) => r.status === 'Dismissed');

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, marginBottom: '0.35rem' }}>
            {t.remindersTitle}
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            {t.remindersSubtitle} Stay ahead of spoiled food and monitor pantry shelf life.
          </p>
        </div>

        <button onClick={() => setIsModalOpen(true)} className="btn btn-primary btn-sm">
          <Plus size={16} />
          {t.addReminder}
        </button>
      </div>

      {/* Active Reminders */}
      <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>
          {t.activeReminders} ({activeList.length})
        </h3>

        {activeList.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', padding: '1rem 0' }}>
            No active expiry reminders right now. Add one manually or scan a product with an expiry date!
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {activeList.map((rem) => {
              const isExpired = rem.days_left < 0;
              const isSoon = rem.days_left >= 0 && rem.days_left <= 7;

              return (
                <div
                  key={rem.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.85rem 1rem',
                    background: 'var(--bg-surface)',
                    borderRadius: 'var(--radius-md)',
                    border: isExpired
                      ? '1px solid rgba(244, 63, 94, 0.4)'
                      : isSoon
                      ? '1px solid rgba(245, 158, 11, 0.4)'
                      : '1px solid var(--border-subtle)',
                    flexWrap: 'wrap',
                    gap: '0.75rem',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '1rem' }}>{rem.product_name}</span>
                      <span className="badge badge-source" style={{ fontSize: '0.65rem' }}>
                        {rem.reminder_type}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                      Date: <strong>{rem.expiry_date}</strong> {rem.notes && `• Note: ${rem.notes}`}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span
                      className={`badge ${isExpired ? 'badge-danger' : isSoon ? 'badge-warning' : 'badge-source'}`}
                      style={{ fontSize: '0.75rem' }}
                    >
                      <Clock size={12} />
                      {isExpired
                        ? `Expired ${Math.abs(rem.days_left)} days ago`
                        : rem.days_left === 0
                        ? t.expiresToday
                        : `${rem.days_left} ${t.daysLeft}`}
                    </span>

                    <button
                      onClick={() => handleToggleStatus(rem)}
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                    >
                      {t.dismiss}
                    </button>

                    <button
                      onClick={() => handleDelete(rem.id)}
                      className="btn btn-danger btn-sm"
                      style={{ padding: '0.3rem 0.5rem' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Dismissed Reminders */}
      {dismissedList.length > 0 && (
        <div className="glass-card">
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
            {t.dismissedReminders} ({dismissedList.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {dismissedList.map((rem) => (
              <div
                key={rem.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.6rem 0.85rem',
                  background: 'rgba(15, 23, 42, 0.4)',
                  borderRadius: 'var(--radius-sm)',
                  opacity: 0.7,
                }}
              >
                <span style={{ fontSize: '0.85rem', textDecoration: 'line-through' }}>
                  {rem.product_name} ({rem.expiry_date})
                </span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => handleToggleStatus(rem)}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.7rem' }}
                  >
                    Reactivate
                  </button>
                  <button
                    onClick={() => handleDelete(rem.id)}
                    className="btn btn-danger btn-sm"
                    style={{ padding: '0.2rem 0.4rem' }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal to Set Reminder */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Set Expiry Reminder</h3>
              <button onClick={() => setIsModalOpen(false)} className="btn btn-secondary btn-sm">✕</button>
            </div>

            <div className="form-group">
              <label className="form-label">Product Name</label>
              <input
                type="text"
                value={prodName}
                onChange={(e) => setProdName(e.target.value)}
                placeholder="e.g. Almond Milk, Tofu, Bread..."
                className="form-input"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">Expiry / Best Before Date</label>
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Type</label>
                <select
                  value={remType}
                  onChange={(e) => setRemType(e.target.value)}
                  className="form-select"
                >
                  <option value="Expiry">Expiry Date</option>
                  <option value="Best Before">Best Before</option>
                  <option value="Use By">Use By</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Notes (Optional)</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Keep frozen, opened on Monday"
                className="form-input"
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
              <button onClick={() => setIsModalOpen(false)} className="btn btn-secondary">
                {t.cancel}
              </button>
              <button onClick={handleCreateReminder} className="btn btn-primary">
                Save Reminder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
