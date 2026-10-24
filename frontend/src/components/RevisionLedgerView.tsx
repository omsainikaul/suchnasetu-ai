import React, { useState } from 'react';
import { GitCompare, AlertTriangle, RefreshCw } from 'lucide-react';
import type { RevisionLedger, RevisionEntry } from '../types';
import { compareRevisions } from '../services/api';

interface RevisionLedgerViewProps {
  currentNoticeText: string;
  currentNoticeTitle: string;
  currentLanguage: string;
}

export const RevisionLedgerView: React.FC<RevisionLedgerViewProps> = ({
  currentNoticeText,
  currentNoticeTitle,
  currentLanguage,
}) => {
  const isHindi = currentLanguage === 'hi';
  const [revisedText, setRevisedText] = useState<string>('');
  const [revisedTitle, setRevisedTitle] = useState<string>('Corrigendum / Revised Notice');
  const [ledger, setLedger] = useState<RevisionLedger | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleLoadSampleCorrigendum = () => {
    setRevisedTitle('Corrigendum to DHE/SCHOL/2026/894');
    setRevisedText(`GOVERNMENT OF UTTAR PRADESH
DIRECTORATE OF HIGHER EDUCATION, LUCKNOW
CORRIGENDUM / AMENDMENT NOTICE
NOTIFICATION NO: DHE/SCHOL/2026/894-CORR-1

SUBJECT: CORRIGENDUM TO NOTIFICATION NO: DHE/SCHOL/2026/894

In partial modification of previous notification DHE/SCHOL/2026/894, the following amendments are hereby notified:

1. EXTENSION OF SUBMISSION DEADLINE:
The last date for submission of physical application dossiers is hereby extended up to 30/11/2026 (5:00 PM).

2. ADDITION OF FAMILY INCOME ELIGIBILITY:
Applicants must possess an annual family income not exceeding Rs. 2,50,000 per annum issued by the competent Revenue Authority (Tehsildar).

3. ALL OTHER TERMS REMAIN UNCHANGED:
Qualifying marks (minimum 65% marks) and helpline (0522-2239401) remain unchanged.`);
  };

  const handleCompare = async () => {
    if (!revisedText.trim()) {
      setError(isHindi ? 'कृपया तुलना करने के लिए संशोधित नोटिस या शुद्धिपत्र दर्ज करें।' : 'Please provide revised notice text to compare.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await compareRevisions({
        sourceText: currentNoticeText,
        targetText: revisedText,
        sourceTitle: currentNoticeTitle || 'Original Notice',
        targetTitle: revisedTitle,
      });
      setLedger(res);
    } catch (err: any) {
      setError(err.message || 'Comparison failed');
    } finally {
      setIsLoading(false);
    }
  };

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'MODIFIED':
        return <span className="slip-badge slip-badge-warning">{isHindi ? 'संशोधित (Modified)' : 'MODIFIED'}</span>;
      case 'ADDED':
        return <span className="slip-badge slip-badge-found">{isHindi ? 'नया जोड़ा गया (Added)' : 'ADDED'}</span>;
      case 'REMOVED':
        return <span className="slip-badge slip-badge-missing">{isHindi ? 'हटाया गया (Removed)' : 'REMOVED'}</span>;
      case 'UNCERTAIN':
        return <span className="slip-badge slip-badge-warning">{isHindi ? 'अस्पष्ट (Uncertain)' : 'UNCERTAIN'}</span>;
      default:
        return <span className="slip-badge slip-badge-confirmed">{isHindi ? 'अपरिवर्तित (Unchanged)' : 'UNCHANGED'}</span>;
    }
  };

  return (
    <div className="card-section" style={{ marginTop: '1rem' }}>
      <div className="card-header-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <GitCompare size={20} className="text-emerald-700" />
          <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 600 }}>
            {isHindi ? 'संशोधन एवं शुद्धिपत्र बहीखाता (Revision Ledger)' : 'Notice Revision & Corrigendum Ledger'}
          </h3>
        </div>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={handleLoadSampleCorrigendum}
          style={{ fontSize: '0.8rem', padding: '0.25rem 0.6rem' }}
        >
          {isHindi ? 'नमूना शुद्धिपत्र लोड करें' : 'Load Sample Corrigendum'}
        </button>
      </div>

      <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1rem' }}>
        {isHindi
          ? 'वर्तमान नोटिस की तुलना किसी शुद्धिपत्र अथवा संशोधित परिपत्र से करें। समय-सीमा विस्तार, पात्रता परिवर्तन एवं शुल्क संशोधनों की स्वचालित जांच करें।'
          : 'Compare this active circular with an official corrigendum, extension, or amendment to detect modifications, extended deadlines, and stale rules.'}
      </p>

      {/* Input row */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
        <input
          type="text"
          value={revisedTitle}
          onChange={(e) => setRevisedTitle(e.target.value)}
          placeholder="Revised Circular Title / Reference"
          className="form-input"
          style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
        />
        <textarea
          rows={5}
          value={revisedText}
          onChange={(e) => setRevisedText(e.target.value)}
          placeholder={isHindi ? 'यहाँ संशोधित नोटिस या शुद्धिपत्र का पाठ पेस्ट करें...' : 'Paste text of revised notice, corrigendum, or amendment here...'}
          className="form-textarea"
          style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
        />
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleCompare}
          disabled={isLoading}
          style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
        >
          {isLoading ? <RefreshCw className="animate-spin" size={16} /> : <GitCompare size={16} />}
          <span>{isLoading ? (isHindi ? 'तुलना की जा रही है...' : 'Comparing circulars...') : (isHindi ? 'अंतर व संशोधन जांचें' : 'Compare Revisions')}</span>
        </button>
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Comparison Results */}
      {ledger && (
        <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          {/* Relationship badge */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="results-kicker">{isHindi ? 'संबंध प्रकार' : 'Relationship'}</span>
              <span style={{ fontWeight: 700, color: '#0f766e', background: '#ccfbf1', padding: '0.2rem 0.6rem', borderRadius: '9999px', fontSize: '0.85rem' }}>
                {ledger.relationship.relationship_type} ({ledger.relationship.confidence})
              </span>
            </div>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{ledger.relationship.explanation}</span>
          </div>

          <div style={{ background: '#ffffff', padding: '0.75rem', borderRadius: '6px', marginBottom: '1rem', borderLeft: '4px solid #0f766e' }}>
            <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 500, color: '#1e293b' }}>
              <strong>{isHindi ? 'परिवर्तन सारांश:' : 'Summary of Changes:'}</strong> {ledger.summary_of_changes}
            </p>
          </div>

          {/* Diff Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#f1f5f9', textAlign: 'left', borderBottom: '2px solid #cbd5e1' }}>
                  <th style={{ padding: '0.5rem' }}>{isHindi ? 'क्षेत्र / नियम' : 'Field / Clause'}</th>
                  <th style={{ padding: '0.5rem' }}>{isHindi ? 'मूल परिपत्र (Old Value)' : 'Original Notice Value'}</th>
                  <th style={{ padding: '0.5rem' }}>{isHindi ? 'संशोधित परिपत्र (New Value)' : 'Revised Notice Value'}</th>
                  <th style={{ padding: '0.5rem' }}>{isHindi ? 'स्थिति' : 'Status'}</th>
                </tr>
              </thead>
              <tbody>
                {ledger.entries.map((entry: RevisionEntry, idx: number) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0', background: entry.change_category === 'MODIFIED' ? '#fffbeb' : '#ffffff' }}>
                    <td style={{ padding: '0.5rem', fontWeight: 600, color: '#334155' }}>{entry.display_name}</td>
                    <td style={{ padding: '0.5rem', color: '#64748b', textDecoration: entry.change_category === 'MODIFIED' ? 'line-through' : 'none' }}>
                      {entry.old_value}
                    </td>
                    <td style={{ padding: '0.5rem', color: entry.change_category === 'MODIFIED' ? '#b45309' : '#0f172a', fontWeight: entry.change_category === 'MODIFIED' ? 600 : 400 }}>
                      {entry.new_value}
                    </td>
                    <td style={{ padding: '0.5rem' }}>
                      {getCategoryBadge(entry.change_category)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
