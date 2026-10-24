import React, { useState } from 'react';
import { X, Check, AlertCircle, ShieldAlert, Quote, Info } from 'lucide-react';
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
  currentLanguage,
}) => {
  const isHindi = currentLanguage === 'hi';
  const initialVal = field
    ? typeof field.value === 'string'
      ? field.value
      : Array.isArray(field.value)
      ? field.value.join(', ')
      : ''
    : '';

  const [val, setVal] = useState(field?.user_confirmed_value || initialVal);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const prevFieldKeyRef = React.useRef<string | null>(null);

  // Keyboard navigation & Escape-to-close
  React.useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    const focusTimer = setTimeout(() => {
      inputRef.current?.focus();
    }, 50);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(focusTimer);
    };
  }, [isOpen, onClose]);

  // Sync val when field changes
  React.useEffect(() => {
    if (field && field.key !== prevFieldKeyRef.current) {
      prevFieldKeyRef.current = field.key;
      setVal(field.user_confirmed_value || initialVal);
      setError(null);
    }
  }, [field, initialVal]);

  if (!isOpen || !field) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !submitting) {
      onClose();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!val.trim()) {
      setError(
        isHindi
          ? 'कृपया एक मान्य मान दर्ज करें।'
          : 'Please provide a valid confirmed value.'
      );
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onConfirm(field.key, val.trim());
      onClose();
    } catch (err: any) {
      setError(err.message || (isHindi ? 'पुष्टि सहेजने में त्रुटि।' : 'Confirmation failed.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onClick={handleBackdropClick}
    >
      <div className="modal-dialog">
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title-row">
            <ShieldAlert size={22} className="text-amber-600" />
            <h3 id="modal-title" className="modal-title">
              {isHindi ? 'अस्पष्ट विवरण की समीक्षा व पुष्टि' : 'Review & Confirm Uncertain Detail'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="modal-close-btn"
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Core Requirement R7 Explanation */}
        <p className="modal-lead-text">
          {isHindi
            ? 'पीएस 02 आवश्यकता: ओसीआर अस्पष्टता या गैर-मानक समय प्रारूप के कारण इस क्षेत्र की मानवीय समीक्षा आवश्यक है। मूल निष्कर्षित मान को अलग से सुरक्षित रखा जाएगा।'
            : 'Requirement R7: This field was flagged due to low character confidence or non-standard formatting. Confirm or edit this value below. The original extraction is preserved separately.'}
        </p>

        {/* Originally Extracted Value Box */}
        <div className="orig-extraction-box">
          <div className="orig-extraction-label">
            {isHindi ? 'मूल रूप से निष्कर्षित मान:' : 'Originally Extracted Value (Unmodified):'}
          </div>
          <div className="orig-extraction-value">
            {initialVal || (isHindi ? 'नोटिस में उल्लेखित नहीं' : 'Not stated in notice')}
          </div>
          {field.uncertainty_reason && (
            <div className="uncertainty-reason-alert">
              <AlertCircle size={14} className="text-amber-700" />
              <span>
                <strong>{isHindi ? 'समीक्षा का कारण:' : 'Reason for Review:'}</strong>{' '}
                {field.uncertainty_reason}
              </span>
            </div>
          )}
        </div>

        {/* Notice Evidence Quote */}
        {field.evidence && field.evidence.length > 0 && (
          <div className="modal-evidence-box">
            <span className="modal-evidence-label">
              <Quote size={12} />
              <span>{isHindi ? 'नोटिस से संबंधित उद्धरण:' : 'Supporting Notice Citation:'}</span>
            </span>
            <blockquote className="modal-evidence-quote">
              "{field.evidence[0]}"
            </blockquote>
          </div>
        )}

        {/* Form Input for Confirmation */}
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-field-group">
            <label htmlFor="confirm-value-input" className="form-label">
              {isHindi ? 'सत्यापित / सही मान दर्ज करें:' : 'Your Confirmed Value:'}
            </label>
            <input
              ref={inputRef}
              id="confirm-value-input"
              type="text"
              value={val}
              onChange={(e) => setVal(e.target.value)}
              className="form-input"
            />
          </div>

          {/* Legal / Administrative Disclaimer */}
          <div className="modal-disclaimer-card">
            <Info size={14} className="disclaimer-info-icon" />
            <span className="disclaimer-info-text">
              {isHindi
                ? 'सूचना: उपयोगकर्ता पुष्टि केवल आपकी व्यक्तिगत तैयारी को ट्रैक करने के लिए है। यह आधिकारिक सरकारी सत्यापन नहीं है।'
                : 'Note: User confirmation is stored as personal preparation metadata. It does NOT constitute official administrative or legal certification.'}
            </span>
          </div>

          {error && (
            <div className="modal-error-alert" role="alert">
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}

          <div className="modal-actions-footer">
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
              <span>
                {submitting
                  ? (isHindi ? 'सहेजा जा रहा है...' : 'Saving...')
                  : (isHindi ? 'पुष्टि करें व सहेजें' : 'Confirm & Save')}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
