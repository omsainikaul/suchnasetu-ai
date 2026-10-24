import React, { useState } from 'react';
import { OriginalNoticeViewer } from './OriginalNoticeViewer';
import { SummaryCard } from './SummaryCard';
import { StructuredFieldsGrid } from './StructuredFieldsGrid';
import { ActionChecklist } from './ActionChecklist';
import { FollowUpQA } from './FollowUpQA';
import { RevisionLedgerView } from './RevisionLedgerView';
import { EligibilityCheckerView } from './EligibilityCheckerView';
import type { NoticeAnalysisResult } from '../types';
import { FileText, GitCompare, UserCheck } from 'lucide-react';

interface MainAnalysisLayoutProps {
  result: NoticeAnalysisResult;
  currentLanguage: string;
  onConfirmField: (fieldKey: string, confirmedValue: string) => Promise<void>;
}

export const MainAnalysisLayout: React.FC<MainAnalysisLayoutProps> = ({
  result,
  currentLanguage,
  onConfirmField,
}) => {
  const isHindi = currentLanguage === 'hi';
  const [activeTab, setActiveTab] = useState<'overview' | 'revisions' | 'eligibility'>('overview');
  const [highlightedSnippet, setHighlightedSnippet] = useState<string | null>(null);

  const handleHighlightEvidence = (snippet: string) => {
    setHighlightedSnippet(snippet);
  };

  const handleClearHighlight = () => {
    setHighlightedSnippet(null);
  };

  return (
    <div className="analysis-two-column-layout">
      {/* Left Column: Original Source Document & Verifiable OCR Text */}
      <aside className="analysis-left-panel" aria-label="Original Notice Source Panel">
        <OriginalNoticeViewer
          ocrText={result.ocr_text}
          confidence={result.ocr_confidence}
          sourceType={result.source_type}
          currentLanguage={currentLanguage}
          highlightSnippet={highlightedSnippet}
          onClearHighlight={handleClearHighlight}
        />
      </aside>

      {/* Right Column: Accessible Breakdown & Interactive Engines */}
      <div className="analysis-right-panel" aria-label="Accessible Breakdown Panel">
        {/* Module Sub-tabs */}
        <div
          role="tablist"
          style={{
            display: 'flex',
            gap: '0.5rem',
            borderBottom: '2px solid #e2e8f0',
            paddingBottom: '0.5rem',
            marginBottom: '1rem',
          }}
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'overview'}
            onClick={() => setActiveTab('overview')}
            className={`btn ${activeTab === 'overview' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem' }}
          >
            <FileText size={15} />
            <span>{isHindi ? 'नोटिस विश्लेषण एवं कार्य योजना' : 'Notice Breakdown & Actions'}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'revisions'}
            onClick={() => setActiveTab('revisions')}
            className={`btn ${activeTab === 'revisions' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem' }}
          >
            <GitCompare size={15} />
            <span>{isHindi ? 'संशोधन बहीखाता (Corrigendum)' : 'Revision Ledger'}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'eligibility'}
            onClick={() => setActiveTab('eligibility')}
            className={`btn ${activeTab === 'eligibility' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem' }}
          >
            <UserCheck size={15} />
            <span>{isHindi ? 'पात्रता परीक्षक' : 'Eligibility Checker'}</span>
          </button>
        </div>

        {/* Tab 1: Primary Notice Breakdown & Actions */}
        {activeTab === 'overview' && (
          <>
            {/* 1. Plain-Language Summary Card with Bilingual TTS */}
            <SummaryCard
              result={result}
              currentLanguage={currentLanguage}
            />

            {/* 2. Six Mandatory Structured Fields Grid (PS 02 R2) */}
            <StructuredFieldsGrid
              fields={result.fields}
              onConfirmField={onConfirmField}
              currentLanguage={currentLanguage}
              onHighlightEvidence={handleHighlightEvidence}
            />

            {/* 3. Ordered Action Checklist with Deadlines & Documents (PS 02 R4) */}
            <ActionChecklist
              checklist={result.checklist}
              documentId={result.document_id}
              currentLanguage={currentLanguage}
              onHighlightEvidence={handleHighlightEvidence}
            />

            {/* 4. Grounded Follow-up Q&A Assistant (PS 02 R6) */}
            <FollowUpQA
              documentId={result.document_id}
              currentLanguage={currentLanguage}
              onHighlightEvidence={handleHighlightEvidence}
            />
          </>
        )}

        {/* Tab 2: Revision & Corrigendum Ledger */}
        {activeTab === 'revisions' && (
          <RevisionLedgerView
            currentNoticeText={result.ocr_text}
            currentNoticeTitle={result.notice_title}
            currentLanguage={currentLanguage}
          />
        )}

        {/* Tab 3: Explainable Eligibility Checker */}
        {activeTab === 'eligibility' && (
          <EligibilityCheckerView
            noticeText={result.ocr_text}
            documentId={result.document_id}
            currentLanguage={currentLanguage}
          />
        )}
      </div>
    </div>
  );
};
