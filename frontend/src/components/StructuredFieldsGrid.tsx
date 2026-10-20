import React, { useState } from 'react';
import {
  Target,
  UserCheck,
  Calendar,
  FileCheck2,
  PhoneCall,
  ArrowRightCircle,
  CheckCircle,
  HelpCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Edit3,
  Quote
} from 'lucide-react';
import type { StructuredField } from '../types';
import { ConfirmModal } from './ConfirmModal';

interface StructuredFieldsGridProps {
  fields: Record<string, StructuredField>;
  onConfirmField: (fieldKey: string, confirmedValue: string) => Promise<void>;
  currentLanguage: string;
}

export const StructuredFieldsGrid: React.FC<StructuredFieldsGridProps> = ({
  fields,
  onConfirmField,
  currentLanguage
}) => {
  const isHindi = currentLanguage === 'hi';
  const [selectedFieldForConfirm, setSelectedFieldForConfirm] = useState<StructuredField | null>(null);
  const [expandedEvidence, setExpandedEvidence] = useState<Record<string, boolean>>({});

  const toggleEvidence = (key: string) => {
    setExpandedEvidence(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const getFieldIcon = (key: string) => {
    switch (key) {
      case 'purpose':
        return <Target size={18} className="text-emerald-700" />;
      case 'eligibility':
        return <UserCheck size={18} className="text-teal-700" />;
      case 'deadline':
        return <Calendar size={18} className="text-blue-700" />;
      case 'required_documents':
        return <FileCheck2 size={18} className="text-indigo-700" />;
      case 'contact':
        return <PhoneCall size={18} className="text-violet-700" />;
      case 'action':
        return <ArrowRightCircle size={18} className="text-emerald-800" />;
      default:
        return <Target size={18} className="text-emerald-700" />;
    }
  };

  const renderStatusBadge = (field: StructuredField) => {
    if (field.is_confirmed) {
      return (
        <span className="status-pill found" title={isHindi ? 'उपयोगकर्ता द्वारा सत्यापित' : 'Confirmed by User'}>
          <CheckCircle size={12} />
          <span>{isHindi ? 'पुष्टीकृत' : 'User Confirmed'}</span>
        </span>
      );
    }

    switch (field.status) {
      case 'found':
        return (
          <span className="status-pill found">
            <CheckCircle size={12} />
            <span>{isHindi ? 'नोटिस में पाया गया' : 'Found in notice'}</span>
          </span>
        );
      case 'not_stated':
        return (
          <span className="status-pill not_stated">
            <HelpCircle size={12} />
            <span>{isHindi ? 'उल्लेखित नहीं' : 'Not stated in notice'}</span>
          </span>
        );
      case 'needs_confirmation':
        return (
          <span className="status-pill needs_confirmation">
            <AlertTriangle size={12} />
            <span>{isHindi ? 'समीक्षा आवश्यक' : 'Needs confirmation'}</span>
          </span>
        );
      default:
        return null;
    }
  };

  const fieldKeysOrder = ['purpose', 'eligibility', 'deadline', 'required_documents', 'contact', 'action'];

  return (
    <div style={{ marginBottom: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--slate-800)' }}>
          {isHindi ? 'छह अनिवार्य संरचित क्षेत्र (PS 02)' : 'Six Mandatory Structured Fields (PS 02)'}
        </h3>
        <span style={{ fontSize: '0.82rem', color: 'var(--slate-500)' }}>
          {isHindi ? 'लापता जानकारी को कभी भी मनगढ़ंत नहीं किया जाता।' : 'Missing fields explicitly labeled "Not stated in notice."'}
        </span>
      </div>

      <div className="grid-fields">
        {fieldKeysOrder.map((key) => {
          const field = fields[key];
          if (!field) return null;

          const isAbsent = field.status === 'not_stated';
          const needsConf = field.status === 'needs_confirmation';
          const hasEvidence = field.evidence && field.evidence.length > 0;
          const isEvidenceOpen = expandedEvidence[key];

          return (
            <div
              key={key}
              className="card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '1.25rem',
                borderLeft: needsConf ? '4px solid #f59e0b' : isAbsent ? '4px solid #94a3b8' : '4px solid #059669',
                backgroundColor: isAbsent ? 'var(--slate-50)' : '#ffffff',
              }}
            >
              <div>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ padding: '6px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--slate-100)' }}>
                      {getFieldIcon(key)}
                    </div>
                    <div>
                      <h4 style={{ fontSize: '0.96rem', fontWeight: 700, color: 'var(--slate-800)' }}>
                        {isHindi && field.label_hi ? field.label_hi : field.label}
                      </h4>
                      {field.confidence !== undefined && field.confidence !== null && !isAbsent && (
                        <span style={{ fontSize: '0.72rem', color: 'var(--slate-400)' }}>
                          Score: {(field.confidence * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>
                  </div>
                  {renderStatusBadge(field)}
                </div>

                {/* Field Value */}
                <div style={{ minHeight: '52px', marginBottom: '0.75rem' }}>
                  {isAbsent ? (
                    <p style={{ fontStyle: 'italic', color: 'var(--slate-500)', fontSize: '0.9rem' }}>
                      {isHindi ? '“सूचना में उल्लेखित नहीं है।”' : '“Not stated in notice.”'}
                    </p>
                  ) : Array.isArray(field.value) ? (
                    <ul style={{ paddingLeft: '1.25rem', fontSize: '0.88rem', color: 'var(--slate-700)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      {field.value.map((doc, idx) => (
                        <li key={idx}>{doc}</li>
                      ))}
                    </ul>
                  ) : (
                    <div>
                      <p style={{ fontSize: '0.92rem', color: 'var(--slate-800)', fontWeight: 500, lineHeight: 1.5 }}>
                        {field.is_confirmed && field.user_confirmed_value ? field.user_confirmed_value : field.value}
                      </p>
                      {field.is_confirmed && field.user_confirmed_value && (
                        <p style={{ fontSize: '0.75rem', color: 'var(--slate-500)', marginTop: '0.2rem' }}>
                          ({isHindi ? 'मूल ओसीआर:' : 'Original:'} {typeof field.value === 'string' ? field.value : ''})
                        </p>
                      )}
                    </div>
                  )}

                  {needsConf && field.uncertainty_reason && (
                    <p style={{ fontSize: '0.76rem', color: 'var(--warning-text)', marginTop: '0.35rem', backgroundColor: 'var(--warning-bg)', padding: '4px 8px', borderRadius: '4px' }}>
                      ⚠️ {field.uncertainty_reason}
                    </p>
                  )}
                </div>
              </div>

              {/* Actions & Evidence */}
              <div style={{ borderTop: '1px solid var(--slate-100)', paddingTop: '0.65rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                  {hasEvidence ? (
                    <button
                      type="button"
                      onClick={() => toggleEvidence(key)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--primary-700)',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        padding: '2px 0'
                      }}
                    >
                      <Quote size={13} />
                      <span>{isHindi ? (isEvidenceOpen ? 'साक्ष्य छिपाएं' : 'साक्ष्य देखें') : (isEvidenceOpen ? 'Hide Evidence' : 'View Evidence')}</span>
                      {isEvidenceOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>
                  ) : (
                    <span style={{ fontSize: '0.75rem', color: 'var(--slate-400)', fontStyle: 'italic' }}>
                      {isHindi ? 'कोई साक्ष्य नहीं' : 'No direct citation'}
                    </span>
                  )}

                  {/* Review & Confirm Button */}
                  {(needsConf || (!isAbsent && !field.is_confirmed)) && (
                    <button
                      type="button"
                      onClick={() => setSelectedFieldForConfirm(field)}
                      style={{
                        fontSize: '0.76rem',
                        fontWeight: 600,
                        padding: '0.25rem 0.6rem',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: needsConf ? 'var(--warning-bg)' : 'var(--slate-100)',
                        color: needsConf ? 'var(--warning-text)' : 'var(--slate-700)',
                        border: needsConf ? '1px solid var(--warning-border)' : '1px solid var(--slate-300)',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem'
                      }}
                      title={isHindi ? 'इस मान की समीक्षा व पुष्टि करें' : 'Review and confirm this value'}
                    >
                      <Edit3 size={12} />
                      <span>{needsConf ? (isHindi ? 'समीक्षा करें' : 'Review & Confirm') : (isHindi ? 'संशोधन' : 'Verify')}</span>
                    </button>
                  )}
                </div>

                {/* Evidence Dropdown */}
                {isEvidenceOpen && hasEvidence && (
                  <div style={{ marginTop: '0.5rem', padding: '0.6rem', backgroundColor: 'var(--slate-50)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--slate-200)', fontSize: '0.8rem', color: 'var(--slate-700)' }}>
                    <p style={{ fontWeight: 600, fontSize: '0.72rem', color: 'var(--slate-500)', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                      {isHindi ? 'नोटिस से मूल पंक्ति:' : 'Grounded Notice Sentence:'}
                    </p>
                    {field.evidence.map((ev, i) => (
                      <p key={i} style={{ fontStyle: 'italic', lineHeight: 1.4, borderLeft: '2px solid var(--primary-600)', paddingLeft: '0.4rem', marginTop: i > 0 ? '0.25rem' : 0 }}>
                        "{ev}"
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <ConfirmModal
        isOpen={selectedFieldForConfirm !== null}
        field={selectedFieldForConfirm}
        onClose={() => setSelectedFieldForConfirm(null)}
        onConfirm={onConfirmField}
        currentLanguage={currentLanguage}
      />
    </div>
  );
};
