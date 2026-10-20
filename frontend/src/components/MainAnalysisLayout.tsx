import React, { useState } from 'react';
import { OriginalNoticeViewer } from './OriginalNoticeViewer';
import { SummaryCard } from './SummaryCard';
import { StructuredFieldsGrid } from './StructuredFieldsGrid';
import { ActionChecklist } from './ActionChecklist';
import { FollowUpQA } from './FollowUpQA';
import type { NoticeAnalysisResult } from '../types';

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

      {/* Right Column: Accessible Breakdown & Next Steps */}
      <div className="analysis-right-panel" aria-label="Accessible Breakdown Panel">
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
          currentLanguage={currentLanguage}
          onHighlightEvidence={handleHighlightEvidence}
        />

        {/* 4. Grounded Follow-up Q&A Assistant (PS 02 R6) */}
        <FollowUpQA
          documentId={result.document_id}
          currentLanguage={currentLanguage}
          onHighlightEvidence={handleHighlightEvidence}
        />
      </div>
    </div>
  );
};
