import React from 'react';
import type { NoticeAnalysisResult, StructuredField } from '../types';
import {
  Calendar,
  AlertTriangle,
  Phone,
  UserCheck,
  Target,
  FileCheck2,
  ArrowRightCircle,
  ShieldAlert,
} from 'lucide-react';

interface CitizenActionSlipProps {
  result: NoticeAnalysisResult;
  currentLanguage: string;
}

export const CitizenActionSlip: React.FC<CitizenActionSlipProps> = ({
  result,
  currentLanguage,
}) => {
  const isHindi = currentLanguage === 'hi';

  const formatFieldValue = (field?: StructuredField): string => {
    if (!field) return isHindi ? 'सूचना में उल्लिखित नहीं है।' : 'Not stated in notice.';
    if (field.is_confirmed && field.user_confirmed_value) {
      return field.user_confirmed_value;
    }
    if (Array.isArray(field.value)) {
      return field.value.join(', ');
    }
    return field.value || (isHindi ? 'सूचना में उल्लिखित नहीं है।' : 'Not stated in notice.');
  };

  const getStatusBadge = (field?: StructuredField) => {
    if (!field) return null;

    if (field.is_confirmed) {
      return (
        <span className="slip-badge slip-badge-confirmed">
          {isHindi ? '✓ उपयोगकर्ता द्वारा पुष्टीकृत' : '✓ User Confirmed'}
        </span>
      );
    }

    if (field.status === 'needs_confirmation') {
      return (
        <span className="slip-badge slip-badge-warning">
          {isHindi ? '⚠ सत्यापन आवश्यक (अपुष्ट)' : '⚠ Needs Verification (Unconfirmed)'}
        </span>
      );
    }

    if (field.status === 'not_stated') {
      return (
        <span className="slip-badge slip-badge-missing">
          {isHindi ? 'लापता / उल्लिखित नहीं' : 'Not Stated in Notice'}
        </span>
      );
    }

    return (
      <span className="slip-badge slip-badge-found">
        {isHindi ? 'नोटिस में पाया गया' : 'Found in Notice'}
      </span>
    );
  };

  const formattedDate = React.useMemo(() => {
    try {
      const d = result.created_at ? new Date(result.created_at) : new Date('2026-10-20');
      return d.toLocaleDateString(isHindi ? 'hi-IN' : 'en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return '2026-10-20';
    }
  }, [result.created_at, isHindi]);

  return (
    <div className="citizen-action-slip" id="citizen-action-slip" aria-label="Citizen Action Slip">
      {/* 1. Header Banner */}
      <header className="slip-header">
        <div className="slip-brand">
          <div className="slip-logo-mark">
            <span className="slip-logo-icon">🏛️</span>
            <div className="slip-logo-text">
              <h1 className="slip-app-title">SUCHNASETU AI • सूचना + सेतु</h1>
              <span className="slip-app-subtitle">
                {isHindi
                  ? 'नागरिक सूचना-से-कार्य योजना पर्ची (Notice-to-Action Citizen Slip)'
                  : 'Notice-to-Action Citizen Action Dossier'}
              </span>
            </div>
          </div>
        </div>

        <div className="slip-doc-meta">
          <div className="slip-meta-item">
            <strong>{isHindi ? 'दस्तावेज़ आईडी:' : 'Document ID:'}</strong>{' '}
            <code>{result.document_id}</code>
          </div>
          <div className="slip-meta-item">
            <strong>{isHindi ? 'जारी तिथि:' : 'Generated Date:'}</strong> {formattedDate}
          </div>
          <div className="slip-meta-item">
            <strong>{isHindi ? 'मॉडल:' : 'Engine:'}</strong> {result.model_used}
          </div>
        </div>
      </header>

      {/* 2. Notice Title Bar */}
      <section className="slip-notice-title-box">
        <span className="slip-kicker">{isHindi ? 'परिपत्र / नोटिस शीर्षक:' : 'Official Notice Title:'}</span>
        <h2 className="slip-notice-title">{result.notice_title}</h2>
      </section>

      {/* 3. Plain Language Summary */}
      <section className="slip-section slip-summary-box">
        <h3 className="slip-section-title">
          {isHindi ? '📌 संक्षिप्त सरल सारांश' : '📌 Plain-Language Summary'}
        </h3>
        <p className="slip-summary-text">{result.summary}</p>
      </section>

      {/* 4. Critical Six Structured Fields */}
      <section className="slip-section slip-fields-section">
        <h3 className="slip-section-title">
          {isHindi ? '📋 छह प्रमुख आवश्यक क्षेत्र (PS 02)' : '📋 Six Mandatory Structured Fields (PS 02)'}
        </h3>

        <div className="slip-fields-grid">
          {/* 1. Purpose */}
          <div className="slip-field-cell">
            <div className="slip-field-label">
              <Target size={13} />
              <span>{isHindi ? '1. उद्देश्य (Purpose)' : '1. Purpose'}</span>
              {getStatusBadge(result.fields.purpose)}
            </div>
            <div className="slip-field-val">{formatFieldValue(result.fields.purpose)}</div>
          </div>

          {/* 2. Eligibility */}
          <div className="slip-field-cell">
            <div className="slip-field-label">
              <UserCheck size={13} />
              <span>{isHindi ? '2. पात्रता (Eligibility)' : '2. Eligibility'}</span>
              {getStatusBadge(result.fields.eligibility)}
            </div>
            <div className="slip-field-val">{formatFieldValue(result.fields.eligibility)}</div>
          </div>

          {/* 3. Deadline (Highlighted) */}
          <div className={`slip-field-cell ${result.fields.deadline?.status === 'needs_confirmation' ? 'slip-cell-warning' : 'slip-cell-highlight'}`}>
            <div className="slip-field-label">
              <Calendar size={13} />
              <span>{isHindi ? '3. अंतिम तिथि / समय सीमा (Deadline)' : '3. Submission Deadline'}</span>
              {getStatusBadge(result.fields.deadline)}
            </div>
            <div className="slip-field-val slip-val-deadline">{formatFieldValue(result.fields.deadline)}</div>
            {result.fields.deadline?.is_confirmed && (
              <div className="slip-orig-note">
                {isHindi ? 'मूल निष्कर्षण: ' : 'Original extraction: '}
                <em>{String(result.fields.deadline.value)}</em>
              </div>
            )}
            {result.fields.deadline?.status === 'needs_confirmation' && !result.fields.deadline.is_confirmed && (
              <div className="slip-warn-note">
                <AlertTriangle size={11} />
                <span>{isHindi ? 'सत्यापन आवश्यक: यह तिथि नोटिस में अस्पष्ट हो सकती है।' : 'Verification required: Unconfirmed date.'}</span>
              </div>
            )}
          </div>

          {/* 4. Required Documents */}
          <div className="slip-field-cell">
            <div className="slip-field-label">
              <FileCheck2 size={13} />
              <span>{isHindi ? '4. आवश्यक दस्तावेज (Documents)' : '4. Required Documents'}</span>
              {getStatusBadge(result.fields.required_documents)}
            </div>
            <div className="slip-field-val">{formatFieldValue(result.fields.required_documents)}</div>
          </div>

          {/* 5. Contact Information */}
          <div className="slip-field-cell">
            <div className="slip-field-label">
              <Phone size={13} />
              <span>{isHindi ? '5. संपर्क विवरण (Contact)' : '5. Contact Info'}</span>
              {getStatusBadge(result.fields.contact)}
            </div>
            <div className="slip-field-val">{formatFieldValue(result.fields.contact)}</div>
          </div>

          {/* 6. Required Action / Next Step */}
          <div className="slip-field-cell">
            <div className="slip-field-label">
              <ArrowRightCircle size={13} />
              <span>{isHindi ? '6. आवश्यक कार्रवाई (Action)' : '6. Immediate Action'}</span>
              {getStatusBadge(result.fields.action)}
            </div>
            <div className="slip-field-val">{formatFieldValue(result.fields.action)}</div>
          </div>
        </div>
      </section>

      {/* 5. Ordered Action Checklist */}
      {result.checklist && result.checklist.length > 0 && (
        <section className="slip-section slip-checklist-section">
          <h3 className="slip-section-title">
            {isHindi ? '✅ व्यावहारिक चरणबद्ध कार्य योजना (चेकलिस्ट)' : '✅ Ordered Action Checklist (Tick as completed)'}
          </h3>

          <div className="slip-checklist-table">
            {result.checklist.map((step) => (
              <div key={step.id || step.step_number} className="slip-checklist-row">
                <div className="slip-step-box">
                  <span className="slip-checkbox-print">☐</span>
                  <span className="slip-step-num">#{step.step_number}</span>
                </div>
                <div className="slip-step-content">
                  <div className="slip-step-action">
                    <strong>{step.action}</strong>
                    {step.deadline && (
                      <span className="slip-step-deadline">
                        [{isHindi ? 'समय सीमा:' : 'Deadline:'} {step.deadline}]
                      </span>
                    )}
                  </div>
                  {step.documents_needed && step.documents_needed.length > 0 && (
                    <div className="slip-step-docs">
                      <em>{isHindi ? 'संलग्न दस्तावेज:' : 'Documents:'}</em> {step.documents_needed.join(', ')}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 6. Critical Warnings and Transparency */}
      {result.needs_user_confirmation && (
        <aside className="slip-warning-banner" role="alert">
          <ShieldAlert size={14} className="slip-warn-icon" />
          <div className="slip-warn-text">
            <strong>{isHindi ? 'महत्वपूर्ण सूचना:' : 'CRITICAL NOTICE:'}</strong>{' '}
            {isHindi
              ? 'इस नोटिस में कुछ विवरण कम वर्ण स्पष्टता या गैर-मानक समय प्रारूप के कारण अपुष्ट हैं। कृपया आवेदन जमा करने से पहले संबंधित विभाग या आधिकारिक वेबसाइट से सीधे पुष्टि करें।'
              : 'Certain details in this notice carry OCR uncertainty or non-standard dates. Do NOT treat unconfirmed values as certified facts. Verify with the issuing department.'}
          </div>
        </aside>
      )}

      {/* 7. Institutional / Legal Disclaimer Footer */}
      <footer className="slip-footer">
        <div className="slip-disclaimer">
          <strong>{isHindi ? 'अस्वीकरण (Disclaimer):' : 'Legal & Administrative Disclaimer:'}</strong>{' '}
          {isHindi
            ? 'सूचना सेतु एआई (SuchnaSetu AI) एक कृत्रिम बुद्धिमत्ता आधारित सूचना सुगमता सहायक है। यह प्रणाली स्वयं कोई आवेदन दाखिल नहीं करती है और न ही किसी सरकारी अथवा प्रशासनिक प्राधिकरण का प्रतिनिधित्व करती है। अंतिम निर्णय लेने से पहले मूल सरकारी परिपत्र की जांच अवश्य करें।'
            : 'SuchnaSetu AI is an assistive document understanding tool powered by open-weight AI. It does not file applications or guarantee eligibility, and is not an official government authority. Always cross-reference with the original physical or gazetted circular.'}
        </div>
        <div className="slip-footer-bottom">
          <span>SuchnaSetu AI • HackDay 2026 PS 02 Track 1</span>
          <span>https://github.com/omsainikaul/suchnasetu-ai</span>
          <span>Verified Citizen Action Slip</span>
        </div>
      </footer>
    </div>
  );
};
