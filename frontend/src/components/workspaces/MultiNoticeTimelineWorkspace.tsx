import React, { useState } from 'react';
import {
  History,
  GitCompare,
  Calendar,
} from 'lucide-react';
import type { NoticeAnalysisResult } from '../../types';
import { detectRelationships } from '../../services/api';

interface MultiNoticeTimelineWorkspaceProps {
  currentLanguage: string;
  result: NoticeAnalysisResult | null;
  onNavigateWorkspace: (id: any) => void;
}

export const MultiNoticeTimelineWorkspace: React.FC<MultiNoticeTimelineWorkspaceProps> = ({
  currentLanguage,
  result,
  onNavigateWorkspace,
}) => {
  const isHindi = currentLanguage === 'hi';

  const [revisedText, setRevisedText] = useState<string>(
    'CORRIGENDUM / AMENDMENT NOTICE\nNotification No: DHE/SCHOL/2026/894-CORR-1\nIn partial modification of previous notification, the last date for submission is extended to 30/11/2026.'
  );
  const [relationshipResult, setRelationshipResult] = useState<any>(null);
  const [isDetecting, setIsDetecting] = useState<boolean>(false);

  const handleDetect = async () => {
    if (!result?.ocr_text && !revisedText) return;
    setIsDetecting(true);
    try {
      const data = await detectRelationships({
        sourceText: result?.ocr_text || 'Original Notice Circular DHE/SCHOL/2026/894',
        targetText: revisedText,
      });
      setRelationshipResult(data);
    } catch (err) {
      console.warn('Relationship detection warning:', err);
    } finally {
      setIsDetecting(false);
    }
  };

  const originalDate = result?.fields?.deadline?.value
    ? Array.isArray(result.fields.deadline.value)
      ? result.fields.deadline.value[0]
      : String(result.fields.deadline.value)
    : '15/11/2026';

  return (
    <div className="timeline-workspace-container">
      {/* 1. Header Bar */}
      <div className="workspace-header-bar">
        <div>
          <div className="workspace-title-row">
            <History size={22} className="text-emerald-700" />
            <h2 className="workspace-title">
              {isHindi ? 'मल्टी-नोटिस समयरेखा (समय-क्रम)' : 'Multi-Notice Relationship Timeline'}
            </h2>
          </div>
          <p className="workspace-subtitle">
            {isHindi
              ? 'मूल परिपत्र, शुद्धिपत्र, तिथि विस्तार और संशोधनों का कालानुक्रमिक संबंध मानचित्रण।'
              : 'Chronological timeline mapping how subsequent corrigenda, amendments, extensions, and cancellations modify the original notice.'}
          </p>
        </div>
      </div>

      {/* 2. Visual Chronological Timeline */}
      <div className="timeline-visual-track">
        {/* Node 1: Original Notice */}
        <div className="timeline-node">
          <div className="node-marker original">
            <span>1</span>
          </div>
          <div className="node-card">
            <div className="node-badge-row">
              <span className="node-type-pill original-pill">
                {isHindi ? 'मूल परिपत्र' : 'Original Circular'}
              </span>
              <span className="node-date">
                <Calendar size={12} />
                <span>{originalDate}</span>
              </span>
            </div>
            <h4 className="node-title">
              {result ? result.notice_title : 'State Post-Matric Merit Scholarship (2026-27)'}
            </h4>
            <p className="node-desc">
              {isHindi
                ? 'मूल अधिसूचना जिसके तहत प्रारंभिक नियम, पात्रता और समय सीमा घोषित की गई थी।'
                : 'Primary circular establishing initial submission guidelines, closing deadline, and document requirements.'}
            </p>
          </div>
        </div>

        {/* Node 2: Corrigendum / Extension */}
        <div className="timeline-node">
          <div className="node-marker corrigendum">
            <span>2</span>
          </div>
          <div className="node-card highlight-card">
            <div className="node-badge-row">
              <span className="node-type-pill corrigendum-pill">
                {isHindi ? 'शुद्धिपत्र / तिथि विस्तार' : 'Corrigendum / Extension'}
              </span>
              <span className="node-date">
                <Calendar size={12} />
                <span>30/11/2026 (Extended)</span>
              </span>
            </div>
            <h4 className="node-title">
              {isHindi
                ? 'अधिसूचना संख्या: DHE/SCHOL/2026/894-CORR-1 (शुद्धिपत्र)'
                : 'Notification No: DHE/SCHOL/2026/894-CORR-1 (Amendment)'}
            </h4>
            <p className="node-desc">
              {isHindi
                ? 'आवेदन जमा करने की अंतिम तिथि को 15/11/2026 से बढ़ाकर 30/11/2026 किया गया।'
                : 'Submission deadline extended from 15/11/2026 to 30/11/2026. All other qualifying requirements confirmed unchanged.'}
            </p>
            <div className="node-actions-row">
              <button
                type="button"
                className="btn-node-inspect"
                onClick={() => onNavigateWorkspace('revision_ledger')}
              >
                <GitCompare size={13} />
                <span>{isHindi ? 'रिवीजन लेजर में अंतर देखें' : 'Inspect Revision Ledger Diff'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Interactive Relationship Detector Box */}
      <div className="relationship-detector-box">
        <div className="detector-header">
          <GitCompare size={18} className="text-emerald-700" />
          <h3 className="detector-title">
            {isHindi ? 'इंटरएक्टिव संबंध डिटेक्टर' : 'Test Notice Relationship Detection'}
          </h3>
        </div>
        <p className="detector-sub">
          {isHindi
            ? 'नीचे किसी अन्य संशोधन या शुद्धिपत्र का पाठ पेस्ट करें और संबंध प्रकार का स्वचालित वर्गीकरण प्राप्त करें।'
            : 'Paste any amendment or revised text below to test automated circular relationship classification.'}
        </p>

        <textarea
          className="detector-textarea"
          rows={4}
          value={revisedText}
          onChange={(e) => setRevisedText(e.target.value)}
          placeholder="Paste revised notice or corrigendum text here..."
        />

        <div className="detector-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleDetect}
            disabled={isDetecting || !revisedText.trim()}
          >
            {isDetecting
              ? (isHindi ? 'संबंध की पहचान की जा रही है...' : 'Classifying Relationship...')
              : (isHindi ? 'संबंध का पता लगाएं' : 'Detect Notice Relationship')}
          </button>
        </div>

        {relationshipResult && (
          <div className="detector-result-card">
            <div className="result-kicker">
              {isHindi ? 'पहचाना गया संबंध:' : 'Detected Relationship Classification:'}
            </div>
            <div className="result-type-badge">
              <strong>{relationshipResult.relationship_type || relationshipResult.relationship}</strong>
            </div>
            {relationshipResult.reference_notice_no && (
              <div className="result-ref">
                {isHindi ? 'संदर्भित अधिसूचना संख्या:' : 'Referenced Circular No:'}{' '}
                <code>{relationshipResult.reference_notice_no}</code>
              </div>
            )}
            {relationshipResult.evidence && relationshipResult.evidence.length > 0 && (
              <blockquote className="result-quote">
                "{relationshipResult.evidence[0]}"
              </blockquote>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
