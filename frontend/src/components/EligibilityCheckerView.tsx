import React, { useState } from 'react';
import { UserCheck, CheckCircle2, XCircle, HelpCircle, AlertCircle, RefreshCw } from 'lucide-react';
import type { EligibilityAssessment, CriterionEvaluationResult } from '../types';
import { evaluateEligibility } from '../services/api';

interface EligibilityCheckerViewProps {
  noticeText: string;
  documentId?: string;
  currentLanguage: string;
}

export const EligibilityCheckerView: React.FC<EligibilityCheckerViewProps> = ({
  noticeText,
  documentId,
  currentLanguage,
}) => {
  const isHindi = currentLanguage === 'hi';

  const [age, setAge] = useState<string>('23');
  const [marks, setMarks] = useState<string>('68');
  const [category, setCategory] = useState<string>('GEN');
  const [degree, setDegree] = useState<string>('B.Tech');
  const [assessment, setAssessment] = useState<EligibilityAssessment | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleEvaluate = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const profile = {
        age: age ? parseInt(age, 10) : undefined,
        percentage: marks ? parseFloat(marks) : undefined,
        qualifications: degree ? [degree] : [],
        category: category || 'GEN',
      };
      const res = await evaluateEligibility({
        noticeText,
        documentId,
        profile,
      });
      setAssessment(res);
    } catch (err: any) {
      setError(err.message || 'Eligibility check failed');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PASS':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: '#15803d', background: '#dcfce7', padding: '0.2rem 0.6rem', borderRadius: '9999px', fontSize: '0.8rem', fontWeight: 600 }}>
            <CheckCircle2 size={13} />
            <span>{isHindi ? 'सफल (PASS)' : 'PASS'}</span>
          </span>
        );
      case 'FAIL':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: '#b91c1c', background: '#fee2e2', padding: '0.2rem 0.6rem', borderRadius: '9999px', fontSize: '0.8rem', fontWeight: 600 }}>
            <XCircle size={13} />
            <span>{isHindi ? 'अपात्र (FAIL)' : 'FAIL'}</span>
          </span>
        );
      default:
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: '#b45309', background: '#fef3c7', padding: '0.2rem 0.6rem', borderRadius: '9999px', fontSize: '0.8rem', fontWeight: 600 }}>
            <HelpCircle size={13} />
            <span>{isHindi ? 'अस्पष्ट (UNKNOWN)' : 'UNKNOWN'}</span>
          </span>
        );
    }
  };

  const getOverallBadge = (overall: string) => {
    switch (overall) {
      case 'ELIGIBLE':
        return (
          <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '0.75rem', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <CheckCircle2 size={20} className="text-emerald-700" />
            <div>
              <strong style={{ color: '#065f46', fontSize: '0.95rem' }}>
                {isHindi ? 'आप इस योजना हेतु पात्र प्रतीत होते हैं (ELIGIBLE)' : 'You appear ELIGIBLE based on notice criteria.'}
              </strong>
              <p style={{ margin: 0, fontSize: '0.825rem', color: '#047857' }}>{assessment?.summary}</p>
            </div>
          </div>
        );
      case 'NOT_ELIGIBLE':
        return (
          <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', padding: '0.75rem', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <XCircle size={20} className="text-rose-700" />
            <div>
              <strong style={{ color: '#9f1239', fontSize: '0.95rem' }}>
                {isHindi ? 'आप अनिवार्य पात्रता शर्तें पूरी नहीं करते हैं (NOT ELIGIBLE)' : 'One or more mandatory criteria were NOT met.'}
              </strong>
              <p style={{ margin: 0, fontSize: '0.825rem', color: '#be123c' }}>{assessment?.summary}</p>
            </div>
          </div>
        );
      default:
        return (
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', padding: '0.75rem', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <HelpCircle size={20} className="text-amber-700" />
            <div>
              <strong style={{ color: '#92400e', fontSize: '0.95rem' }}>
                {isHindi ? 'पात्रता की पुष्टि हेतु अतिरिक्त विवरण आवश्यक (INCONCLUSIVE)' : 'Evaluation Inconclusive. Manual verification advised.'}
              </strong>
              <p style={{ margin: 0, fontSize: '0.825rem', color: '#b45309' }}>{assessment?.summary}</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="card-section" style={{ marginTop: '1rem' }}>
      <div className="card-header-row" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <UserCheck size={20} className="text-emerald-700" />
        <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 600 }}>
          {isHindi ? 'स्पष्टीकरणात्मक नागरिक पात्रता परीक्षक (Explainable Eligibility Engine)' : 'Explainable Applicant Eligibility Checker'}
        </h3>
      </div>

      <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1rem' }}>
        {isHindi
          ? 'अपनी आयु, अंक प्रतिशत, शैक्षणिक योग्यता एवं श्रेणी दर्ज करें। सूचना में दिए गए आधिकारिक नियमों के अनुसार अपनी पात्रता का साक्ष्य-आधारित मूल्यांकन प्राप्त करें।'
          : 'Enter your applicant details to deterministically test eligibility rules extracted from the notice with verbatim source citations.'}
      </p>

      {/* Applicant Input Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
            {isHindi ? 'आयु (Years)' : 'Age (Years)'}
          </label>
          <input
            type="number"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            className="form-input"
            style={{ width: '100%', padding: '0.4rem 0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
            {isHindi ? 'अंक % या CGPA' : 'Marks % / CGPA'}
          </label>
          <input
            type="number"
            step="0.1"
            value={marks}
            onChange={(e) => setMarks(e.target.value)}
            className="form-input"
            style={{ width: '100%', padding: '0.4rem 0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
            {isHindi ? 'आरक्षण श्रेणी' : 'Category'}
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="form-select"
            style={{ width: '100%', padding: '0.4rem 0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
          >
            <option value="GEN">General (GEN)</option>
            <option value="OBC">OBC</option>
            <option value="SC">SC</option>
            <option value="ST">ST</option>
            <option value="EWS">EWS</option>
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
            {isHindi ? 'उच्चतम योग्यता' : 'Highest Degree'}
          </label>
          <input
            type="text"
            value={degree}
            onChange={(e) => setDegree(e.target.value)}
            className="form-input"
            placeholder="e.g. B.Tech, Graduate"
            style={{ width: '100%', padding: '0.4rem 0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
          />
        </div>
      </div>

      <button
        type="button"
        className="btn btn-primary"
        onClick={handleEvaluate}
        disabled={isLoading}
        style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1rem' }}
      >
        {isLoading ? <RefreshCw className="animate-spin" size={16} /> : <UserCheck size={16} />}
        <span>{isLoading ? (isHindi ? 'जांच की जा रही है...' : 'Evaluating...') : (isHindi ? 'मेरी पात्रता जांचें' : 'Evaluate My Eligibility')}</span>
      </button>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Assessment Breakdown */}
      {assessment && (
        <div>
          {getOverallBadge(assessment.overall_status)}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {assessment.results.map((res: CriterionEvaluationResult, idx: number) => (
              <div
                key={idx}
                style={{
                  padding: '0.75rem',
                  borderRadius: '6px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1e293b' }}>
                    {res.description}
                  </span>
                  {getStatusBadge(res.status)}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  <strong>{isHindi ? 'आपका विवरण:' : 'Your input:'}</strong> {res.applicant_value} | <strong>{isHindi ? 'नोटिस आवश्यकता:' : 'Requirement:'}</strong> {res.requirement_value}
                </div>
                <p style={{ margin: 0, fontSize: '0.825rem', color: '#334155' }}>{res.explanation}</p>
                {res.evidence_quote && (
                  <div style={{ fontSize: '0.75rem', color: '#0f766e', background: '#f0fdfa', padding: '0.3rem 0.5rem', borderRadius: '4px' }}>
                    <strong>{isHindi ? 'नोटिस साक्ष्य:' : 'Verbatim Citation:'}</strong> &ldquo;{res.evidence_quote}&rdquo;
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
