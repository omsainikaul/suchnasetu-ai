import React, { useState } from 'react';
import {
  Target,
  UserCheck,
  Calendar,
  FileCheck2,
  PhoneCall,
  ArrowRightCircle,
  CheckCircle2,
  HelpCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Edit3,
  Quote,
  ExternalLink,
} from 'lucide-react';
import type { StructuredField } from '../types';
import { ConfirmModal } from './ConfirmModal';

interface StructuredFieldsGridProps {
  fields: Record<string, StructuredField>;
  onConfirmField: (fieldKey: string, confirmedValue: string) => Promise<void>;
  currentLanguage: string;
  onHighlightEvidence?: (evidenceSnippet: string) => void;
}

export const StructuredFieldsGrid: React.FC<StructuredFieldsGridProps> = ({
  fields,
  onConfirmField,
  currentLanguage,
  onHighlightEvidence,
}) => {
  const isHindi = currentLanguage === 'hi';
  const [selectedFieldForConfirm, setSelectedFieldForConfirm] = useState<StructuredField | null>(null);
  const [expandedEvidence, setExpandedEvidence] = useState<Record<string, boolean>>({});

  const toggleEvidence = (key: string, snippet?: string) => {
    const nextState = !expandedEvidence[key];
    setExpandedEvidence((prev) => ({ ...prev, [key]: nextState }));
    if (nextState && snippet && onHighlightEvidence) {
      onHighlightEvidence(snippet);
    }
  };

  const getFieldIcon = (key: string) => {
    switch (key) {
      case 'purpose':
        return <Target size={18} className="field-icon-emerald" />;
      case 'eligibility':
        return <UserCheck size={18} className="field-icon-teal" />;
      case 'deadline':
        return <Calendar size={18} className="field-icon-blue" />;
      case 'required_documents':
        return <FileCheck2 size={18} className="field-icon-indigo" />;
      case 'contact':
        return <PhoneCall size={18} className="field-icon-violet" />;
      case 'action':
        return <ArrowRightCircle size={18} className="field-icon-emerald" />;
      default:
        return <Target size={18} className="field-icon-emerald" />;
    }
  };

  const renderStatusBadge = (field: StructuredField) => {
    if (field.is_confirmed) {
      return (
        <span className="status-pill pill-confirmed" title="Confirmed by user review">
          <CheckCircle2 size={12} />
          <span>{isHindi ? 'पुष्टीकृत (उपयोगकर्ता)' : 'User Confirmed'}</span>
        </span>
      );
    }

    switch (field.status) {
      case 'found':
        return (
          <span className="status-pill pill-found" title="Fact explicitly present in notice">
            <CheckCircle2 size={12} />
            <span>{isHindi ? 'नोटिस में पाया गया' : 'Found in notice'}</span>
          </span>
        );
      case 'not_stated':
        return (
          <span className="status-pill pill-not-stated" title="Explicitly absent from the circular">
            <HelpCircle size={12} />
            <span>{isHindi ? 'उल्लेखित नहीं' : 'Not stated in notice'}</span>
          </span>
        );
      case 'needs_confirmation':
        return (
          <span className="status-pill pill-uncertain" title="Low OCR confidence or ambiguous date/time">
            <AlertTriangle size={12} />
            <span>{isHindi ? 'समीक्षा आवश्यक' : 'Needs confirmation'}</span>
          </span>
        );
      case 'failed':
        return (
          <span className="status-pill pill-failed">
            <AlertTriangle size={12} />
            <span>{isHindi ? 'निष्कर्षण विफल' : 'Extraction failed'}</span>
          </span>
        );
      default:
        return null;
    }
  };

  const fieldKeysOrder = ['purpose', 'eligibility', 'deadline', 'required_documents', 'contact', 'action'];

  return (
    <section className="structured-fields-section" aria-labelledby="structured-fields-title">
      {/* Section Header */}
      <div className="section-title-bar">
        <div>
          <h3 id="structured-fields-title" className="section-h3">
            {isHindi ? 'छह अनिवार्य संरचित क्षेत्र (PS 02)' : 'Six Mandatory Structured Fields (PS 02)'}
          </h3>
          <p className="section-subtext">
            {isHindi
              ? 'नोटिस में अनुपस्थित तथ्यों को कभी भी मनगढ़ंत नहीं किया जाता; उन्हें स्पष्ट रूप से "उल्लेखित नहीं" चिह्नित किया जाता है।'
              : 'Every mandatory field is strictly grounded in notice text. Absent information is explicitly marked "Not stated in notice."'}
          </p>
        </div>
      </div>

      {/* Grid of 6 Cards */}
      <div className="fields-grid-container">
        {fieldKeysOrder.map((key) => {
          const field = fields[key];
          if (!field) return null;

          const isAbsent = field.status === 'not_stated';
          const needsConf = field.status === 'needs_confirmation';
          const hasEvidence = field.evidence && field.evidence.length > 0;
          const firstEvidence = hasEvidence ? field.evidence[0] : '';
          const isEvidenceOpen = expandedEvidence[key];

          return (
            <article
              key={key}
              className={`field-card ${isAbsent ? 'card-absent' : ''} ${needsConf ? 'card-uncertain' : ''}`}
            >
              {/* Field Header */}
              <div className="field-card-header">
                <div className="field-title-wrap">
                  <div className="field-icon-box">{getFieldIcon(key)}</div>
                  <h4 className="field-title">
                    {isHindi ? field.label_hi || field.label : field.label}
                  </h4>
                </div>
                {renderStatusBadge(field)}
              </div>

              {/* Field Value Display */}
              <div className="field-card-body">
                {isAbsent ? (
                  <div className="field-absent-notice">
                    <p className="absent-main-text">
                      {isHindi ? 'नोटिस में उल्लेखित नहीं।' : 'Not stated in notice.'}
                    </p>
                    <p className="absent-subtext">
                      {isHindi
                        ? 'परिपत्र में इस आवश्यकता का कोई आधिकारिक उल्लेख नहीं है।'
                        : 'The supplied notice does not mention this requirement.'}
                    </p>
                  </div>
                ) : Array.isArray(field.value) ? (
                  <ul className="field-list-value">
                    {field.value.map((item, idx) => (
                      <li key={idx} className="field-list-item">
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="field-text-value">
                    <p>{field.value}</p>
                    {field.is_confirmed && field.user_confirmed_value && (
                      <div className="confirmed-meta-box">
                        <span className="confirmed-meta-label">
                          {isHindi ? 'सत्यापित मान:' : 'User Confirmed Value:'}
                        </span>
                        <span className="confirmed-meta-value">{field.user_confirmed_value}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Uncertainty Warning Box & Action */}
                {needsConf && (
                  <div className="field-uncertain-alert">
                    <div className="uncertain-alert-header">
                      <AlertTriangle size={15} className="text-amber-700" />
                      <span className="uncertain-alert-title">
                        {isHindi ? 'समीक्षा व पुष्टि आवश्यक' : 'Review & Confirmation Required'}
                      </span>
                    </div>
                    {field.uncertainty_reason && (
                      <p className="uncertain-reason-text">{field.uncertainty_reason}</p>
                    )}
                    <button
                      type="button"
                      className="btn btn-confirm-action"
                      onClick={() => setSelectedFieldForConfirm(field)}
                    >
                      <Edit3 size={13} />
                      <span>{isHindi ? 'समीक्षा व पुष्टि करें' : 'Review & Confirm'}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Expandable Source Evidence Section */}
              <div className="field-card-footer">
                {hasEvidence ? (
                  <div>
                    <button
                      type="button"
                      className="evidence-toggle-btn"
                      onClick={() => toggleEvidence(key, firstEvidence)}
                      aria-expanded={isEvidenceOpen}
                    >
                      <div className="evidence-btn-label">
                        <Quote size={13} />
                        <span>{isHindi ? 'नोटिस से साक्ष्य उद्धरण' : 'Source Evidence'}</span>
                      </div>
                      {isEvidenceOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>

                    {isEvidenceOpen && (
                      <div className="evidence-content-drawer">
                        <blockquote className="evidence-quote">
                          "{firstEvidence}"
                        </blockquote>
                        {onHighlightEvidence && (
                          <button
                            type="button"
                            className="btn-highlight-source"
                            onClick={() => onHighlightEvidence(firstEvidence)}
                            title="Highlight in left notice viewer"
                          >
                            <ExternalLink size={12} />
                            <span>{isHindi ? 'मूल पाठ में देखें' : 'View in Source'}</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <span className="no-evidence-note">
                    {isAbsent
                      ? (isHindi ? 'कोई साक्ष्य उपलब्ध नहीं (लापता तथ्य)' : 'No notice evidence found (omitted requirement)')
                      : (isHindi ? 'प्रत्यक्ष साक्ष्य उपलब्ध नहीं' : 'No verbatim quotation found')}
                  </span>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={!!selectedFieldForConfirm}
        field={selectedFieldForConfirm}
        onClose={() => setSelectedFieldForConfirm(null)}
        onConfirm={onConfirmField}
        currentLanguage={currentLanguage}
      />
    </section>
  );
};
