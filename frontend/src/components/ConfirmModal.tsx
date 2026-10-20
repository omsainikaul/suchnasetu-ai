import React, { useState } from 'react';
import { X, Check, AlertCircle, ShieldAlert } from 'lucide-react';
import type { StructuredField } from '../types';

interface ConfirmModalProps {
  isOpen: boolean;
  field: StructuredField | null;
  onClose: () => void;
  onConfirm: (fieldKey: string, confirmedValue: string) => Promise<void>;
  currentLanguage: string;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  field,
  onClose,
  onConfirm,
  currentLanguage
}) => {
  if (!isOpen || !field) return null;

  const isHindi = currentLanguage === 'hi';
  const initialVal = typeof field.value === 'string' ? field.value : (Array.isArray(field.value) ? field.value.join(', ') : '');
  const [val, setVal] = useState(field.user_confirmed_value || initialVal);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!val.trim()) {
      setError(isHindi ? 'कृपया मान्य मान दर्ज करें।' : 'Please provide a valid confirmed value.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onConfirm(field.key, val.trim());
      onClose();
    } catch (err: any) {
      setError(err.message || 'Confirmation failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="modal-dialog">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 id="modal-title" style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--slate-800)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldAlert size={20} className="text-amber-600" />
            <span>{isHindi ? 'विवरण की समीक्षा व पुष्टि' : 'Review & Confirm Field'}</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--slate-400)' }}
            aria-label="Close dialog"
          >
            <X size={20} />
          </button>
        </div>

        <p style={{ fontSize: '0.86rem', color: 'var(--slate-600)', marginBottom: '1rem' }}>
          {isHindi
            ? 'ओसीआर अस्पष्टता या गैर-मानक प्रारूप के कारण इस क्षेत्र की पुष्टि आवश्यक है। मूल निष्कर्षण सुरक्षित रहेगा।'
            : 'Requirement R7: Review this uncertain extraction. The system will record your confirmation without overwriting the original extraction.'}
        </p>

        <div style={{ padding: '0.85rem', backgroundColor: 'var(--slate-50)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--slate-200)', marginBottom: '1rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--slate-500)', textTransform: 'uppercase' }}>
            {isHindi ? 'मूल निष्कर्षित मान:' : 'Originally Extracted Value:'}
          </span>
          <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--slate-800)', marginTop: '0.2rem' }}>
            {initialVal || (isHindi ? 'सूचना में उल्लेखित नहीं' : 'Not stated in notice')}
          </p>
          {field.uncertainty_reason && (
            <p style={{ fontSize: '0.78rem', color: 'var(--warning-text)', marginTop: '0.35rem' }}>
              ⚠️ {field.uncertainty_reason}
            </p>
          )}
        </div>

        {field.evidence && field.evidence.length > 0 && (
          <div style={{ marginBottom: '1rem', fontSize: '0.82rem', color: 'var(--slate-600)' }}>
            <span style={{ fontWeight: 600 }}>{isHindi ? 'सूचना से साक्ष्य:' : 'Notice Evidence:'}</span>
            <blockquote style={{ fontStyle: 'italic', borderLeft: '2px solid var(--primary-500)', paddingLeft: '0.5rem', marginTop: '0.2rem' }}>
              "{field.evidence[0]}"
            </blockquote>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.25rem' }}>
            <label htmlFor="confirm-value-input" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--slate-700)', marginBottom: '0.35rem' }}>
              {isHindi ? 'सत्यापित / सही मान दर्ज करें:' : 'Your Confirmed Value:'}
            </label>
            <input
              id="confirm-value-input"
              type="text"
              value={val}
              onChange={(e) => setVal(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--slate-300)',
                fontSize: '0.92rem',
                color: 'var(--slate-800)',
              }}
              autoFocus
            />
          </div>

          {error && (
            <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger-text)', fontSize: '0.82rem' }}>
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={submitting}
            >
              {isHindi ? 'रद्द करें' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              <Check size={16} />
              <span>{submitting ? (isHindi ? 'सहेजा जा रहा है...' : 'Saving...') : (isHindi ? 'पुष्टि करें व सहेजें' : 'Confirm & Save')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
