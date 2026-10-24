import React, { useState } from 'react';
import {
  Compass,
  Calendar,
  CheckSquare,
  Square,
  FileCheck2,
  Quote,
  ShieldAlert,
} from 'lucide-react';
import type { NoticeAnalysisResult } from '../../types';
import { saveDocumentState } from '../../services/storage';

interface ActionNavigatorWorkspaceProps {
  currentLanguage: string;
  result: NoticeAnalysisResult | null;
  onHighlightEvidence?: (snippet: string) => void;
  onNavigateWorkspace: (id: any) => void;
}

function computeUrgencyGroup(deadlineStr?: string) {
  if (!deadlineStr || !deadlineStr.trim()) return 'unclear';
  const lower = deadlineStr.toLowerCase();
  if (lower.includes('unclear') || lower.includes('not stated') || lower.includes('sunset') || lower.includes('tbd')) {
    return 'review';
  }
  const match = deadlineStr.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/);
  if (!match) return 'unclear';
  const d = parseInt(match[1], 10);
  const m = parseInt(match[2], 10) - 1;
  let y = parseInt(match[3], 10);
  if (y < 100) y += 2000;
  const targetDate = new Date(y, m, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 'past';
  if (diffDays === 0) return 'today';
  if (diffDays <= 3) return 'soon';
  return 'upcoming';
}

export const ActionNavigatorWorkspace: React.FC<ActionNavigatorWorkspaceProps> = ({
  currentLanguage,
  result,
  onHighlightEvidence,
  onNavigateWorkspace,
}) => {
  const isHindi = currentLanguage === 'hi';

  const [completedItems, setCompletedItems] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    if (result?.checklist) {
      for (const item of result.checklist) {
        const key = item.id || `step_${item.step_number}`;
        if (item.completed) init[key] = true;
      }
    }
    return init;
  });

  if (!result) {
    return (
      <div className="empty-workspace-state">
        <Compass size={40} className="empty-state-icon text-emerald-700" />
        <h3>{isHindi ? 'कोई परिपत्र लोड नहीं है' : 'No Circular Loaded in Workspace'}</h3>
        <p>
          {isHindi
            ? 'एक्शन नेविगेटर का उपयोग करने के लिए पहले डैशबोर्ड या इनपुट अनुभाग से कोई नोटिस अपलोड या चुनें।'
            : 'To use the Action Navigator roadmap, upload a circular or load a demonstration notice first.'}
        </p>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => onNavigateWorkspace('ingestion')}
        >
          {isHindi ? 'नोटिस अपलोड करें' : 'Upload or Select a Notice'}
        </button>
      </div>
    );
  }

  const checklist = result.checklist || [];

  const toggleItem = (id: string) => {
    setCompletedItems((prev) => {
      const updated = { ...prev, [id]: !prev[id] };
      const completedIds = Object.keys(updated).filter((k) => updated[k]);
      saveDocumentState(result.document_id, { completedChecklistIds: completedIds });
      return updated;
    });
  };

  const completedCount = Object.values(completedItems).filter(Boolean).length;
  const totalCount = checklist.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="action-navigator-container">
      {/* 1. Header Bar */}
      <div className="workspace-header-bar">
        <div>
          <div className="workspace-title-row">
            <Compass size={22} className="text-emerald-700" />
            <h2 className="workspace-title">
              {isHindi ? 'एक्शन नेविगेटर — समय सीमा रोडमैप' : 'Action Navigator — Deadline Roadmap'}
            </h2>
          </div>
          <p className="workspace-subtitle">
            {isHindi
              ? 'परिपत्र की समय सीमा और दस्तावेजी आवश्यकताओं के आधार पर प्राथमिकता-वार व्यक्तिगत कार्य योजना।'
              : 'Chronological next-steps roadmap prioritized by official submission cutoff dates and document prerequisites.'}
          </p>
        </div>

        {/* Progress Metric */}
        <div className="navigator-progress-box">
          <div className="progress-labels">
            <span className="progress-text">
              {completedCount} / {totalCount} {isHindi ? 'चरण पूर्ण' : 'Steps Completed'}
            </span>
            <span className="progress-pct">{progressPercent}%</span>
          </div>
          <div className="progress-track" role="progressbar" aria-valuenow={progressPercent} aria-valuemin={0} aria-valuemax={100}>
            <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>
      </div>

      {/* 2. Official Action Disclaimer */}
      <div className="official-disclaimer-note" role="note">
        <ShieldAlert size={15} className="disclaimer-icon" />
        <span className="disclaimer-text">
          {isHindi
            ? 'महत्वपूर्ण: चरणों पर टिक लगाना आपकी व्यक्तिगत तैयारी को ट्रैक करने के लिए है। यह आधिकारिक आवेदन जमा करने का विकल्प नहीं है।'
            : 'Important: Checking off roadmap items tracks your personal preparation. It does NOT constitute official submission or legal filing.'}
        </span>
      </div>

      {/* 3. Roadmap Action Cards */}
      <div className="roadmap-cards-stack">
        {checklist.map((item, index) => {
          const isDone = !!completedItems[item.id || `step_${item.step_number}`];
          const urgency = computeUrgencyGroup(item.deadline);

          let urgencyTag = { label: isHindi ? 'आगामी' : 'Upcoming', className: 'urgency-upcoming' };
          if (urgency === 'past') {
            urgencyTag = { label: isHindi ? 'समय समाप्त' : 'Past Deadline', className: 'urgency-past' };
          } else if (urgency === 'today') {
            urgencyTag = { label: isHindi ? 'आज अंतिम तिथि' : 'Due Today', className: 'urgency-today' };
          } else if (urgency === 'soon') {
            urgencyTag = { label: isHindi ? 'शीघ्र समाप्त' : 'Due Soon', className: 'urgency-soon' };
          } else if (urgency === 'review') {
            urgencyTag = { label: isHindi ? 'समीक्षा आवश्यक' : 'Review Phrasing', className: 'urgency-review' };
          }

          return (
            <div
              key={item.id || index}
              className={`roadmap-card ${isDone ? 'card-completed' : ''}`}
            >
              <div className="roadmap-card-left">
                <button
                  type="button"
                  className="btn-roadmap-checkbox"
                  onClick={() => toggleItem(item.id || `step_${item.step_number}`)}
                  aria-checked={isDone}
                  role="checkbox"
                >
                  {isDone ? <CheckSquare size={22} className="text-emerald-700" /> : <Square size={22} />}
                </button>
                <div className="roadmap-step-badge">
                  #{item.step_number}
                </div>
              </div>

              <div className="roadmap-card-body">
                <div className="roadmap-title-row">
                  <h4 className={`roadmap-action-title ${isDone ? 'text-strikethrough' : ''}`}>
                    {item.action}
                  </h4>
                  <span className={`roadmap-urgency-chip ${urgencyTag.className}`}>
                    {urgencyTag.label}
                  </span>
                </div>

                <div className="roadmap-meta-row">
                  {item.deadline && (
                    <div className="roadmap-meta-item">
                      <Calendar size={13} className="text-amber-700" />
                      <span><strong>{isHindi ? 'अंतिम तिथि:' : 'Cutoff:'}</strong> {item.deadline}</span>
                    </div>
                  )}

                  {item.documents_needed && item.documents_needed.length > 0 && (
                    <div className="roadmap-meta-item">
                      <FileCheck2 size={13} className="text-emerald-700" />
                      <span><strong>{isHindi ? 'आवश्यक दस्तावेज:' : 'Documents:'}</strong> {item.documents_needed.join(', ')}</span>
                    </div>
                  )}
                </div>

                {item.evidence && item.evidence.length > 0 && (
                  <blockquote
                    className="roadmap-evidence-snippet"
                    onClick={() => onHighlightEvidence && onHighlightEvidence(item.evidence[0])}
                    style={{ cursor: onHighlightEvidence ? 'pointer' : 'default' }}
                    title={onHighlightEvidence ? 'Click to inspect in source notice' : undefined}
                  >
                    <Quote size={12} style={{ display: 'inline', marginRight: '4px' }} />
                    "{item.evidence[0]}"
                  </blockquote>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
