import React, { useState } from 'react';
import {
  ListOrdered,
  CheckSquare,
  Square,
  Calendar,
  FileCheck2,
  AlertCircle,
  Quote,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { ChecklistItem } from '../types';

import { saveDocumentState } from '../services/storage';

function computeDeadlineStatus(deadlineStr?: string, isHindi: boolean = false) {
  if (!deadlineStr || !deadlineStr.trim()) return null;
  const lower = deadlineStr.toLowerCase();
  if (lower.includes('unclear') || lower.includes('not stated') || lower.includes('tbd') || lower.includes('sunset')) {
    return { label: isHindi ? 'समीक्षा आवश्यक' : 'Review needed', type: 'review' };
  }
  const match = deadlineStr.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/);
  if (!match) return null;
  const d = parseInt(match[1], 10);
  const m = parseInt(match[2], 10) - 1;
  let y = parseInt(match[3], 10);
  if (y < 100) y += 2000;
  const targetDate = new Date(y, m, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { label: isHindi ? 'समय समाप्त' : 'Past deadline', type: 'past' };
  if (diffDays === 0) return { label: isHindi ? 'आज अंतिम तिथि' : 'Due today', type: 'today' };
  if (diffDays <= 3) return { label: isHindi ? `${diffDays} दिन शेष` : `Due in ${diffDays}d`, type: 'soon' };
  return { label: isHindi ? 'आगामी' : 'Upcoming', type: 'upcoming' };
}

interface ActionChecklistProps {
  checklist: ChecklistItem[];
  currentLanguage: string;
  documentId?: string;
  onHighlightEvidence?: (evidenceSnippet: string) => void;
}

export const ActionChecklist: React.FC<ActionChecklistProps> = ({
  checklist,
  currentLanguage,
  documentId,
  onHighlightEvidence,
}) => {
  const isHindi = currentLanguage === 'hi';
  const [completedItems, setCompletedItems] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const item of checklist) {
      const key = item.id || `step_${item.step_number}`;
      if (item.completed) {
        init[key] = true;
      }
    }
    return init;
  });
  const [expandedEvidence, setExpandedEvidence] = useState<Record<string, boolean>>({});

  const prevDocIdRef = React.useRef<string | undefined>(documentId);

  // Re-sync if document session switches
  React.useEffect(() => {
    if (documentId !== prevDocIdRef.current) {
      prevDocIdRef.current = documentId;
      const next: Record<string, boolean> = {};
      for (const item of checklist) {
        const key = item.id || `step_${item.step_number}`;
        if (item.completed) {
          next[key] = true;
        }
      }
      setCompletedItems(next);
    }
  }, [checklist, documentId]);

  const toggleItem = (id: string) => {
    setCompletedItems((prev) => {
      const updated = { ...prev, [id]: !prev[id] };
      if (documentId) {
        const completedIds = Object.keys(updated).filter((k) => updated[k]);
        saveDocumentState(documentId, { completedChecklistIds: completedIds });
      }
      return updated;
    });
  };

  const toggleEvidence = (id: string, snippet?: string) => {
    const nextState = !expandedEvidence[id];
    setExpandedEvidence((prev) => ({ ...prev, [id]: nextState }));
    if (nextState && snippet && onHighlightEvidence) {
      onHighlightEvidence(snippet);
    }
  };

  const completedCount = Object.values(completedItems).filter(Boolean).length;
  const totalCount = checklist.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <section className="checklist-card" aria-labelledby="checklist-heading">
      {/* Checklist Header */}
      <div className="checklist-header">
        <div>
          <div className="checklist-title-row">
            <ListOrdered size={20} className="text-emerald-700" />
            <h3 id="checklist-heading" className="checklist-title">
              {isHindi ? 'क्रमबद्ध कार्य योजना (चेकलिस्ट)' : 'Ordered Action Checklist'}
            </h3>
          </div>
          <p className="checklist-subtitle">
            {isHindi
              ? 'परिपत्र के आधार पर तैयार किए गए व्यावहारिक चरणबद्ध कदम।'
              : 'Chronological next steps directly derived from the notice requirements.'}
          </p>
        </div>

        {/* Progress Metric */}
        <div className="checklist-progress-wrap">
          <div className="progress-labels">
            <span className="progress-text">
              {completedCount} / {totalCount} {isHindi ? 'पूर्ण' : 'Completed'}
            </span>
            <span className="progress-pct">{progressPercent}%</span>
          </div>
          <div className="progress-track" role="progressbar" aria-valuenow={progressPercent} aria-valuemin={0} aria-valuemax={100}>
            <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>
      </div>

      {/* Official Disclaimer Note (PS 02 Requirement R4) */}
      <div className="official-disclaimer-note" role="note">
        <AlertCircle size={15} className="disclaimer-icon" />
        <span className="disclaimer-text">
          {isHindi
            ? 'महत्वपूर्ण सूचना: चेकलिस्ट पर टिक लगाना केवल आपकी व्यक्तिगत तैयारी को ट्रैक करने के लिए है। यह आधिकारिक आवेदन या जमा की पुष्टि नहीं करता है।'
            : 'Important: Checking off items tracks your personal preparation. It does NOT constitute official submission or legal filing of your application.'}
        </span>
      </div>

      {/* Checklist Steps */}
      <div className="checklist-items-stack">
        {checklist.map((item) => {
          const isDone = !!completedItems[item.id];
          const hasEvidence = item.evidence && item.evidence.length > 0;
          const firstEvidence = hasEvidence ? item.evidence[0] : '';
          const isEvidenceOpen = expandedEvidence[item.id];

          return (
            <div
              key={item.id}
              className={`checklist-item-card ${isDone ? 'item-completed' : ''}`}
            >
              <div
                className="item-click-target"
                onClick={() => toggleItem(item.id)}
                role="checkbox"
                aria-checked={isDone}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault();
                    toggleItem(item.id);
                  }
                }}
              >
                <div className={`checkbox-indicator ${isDone ? 'checked' : ''}`}>
                  {isDone ? <CheckSquare size={20} /> : <Square size={20} />}
                </div>

                <div className="item-content">
                  <div className="item-step-row">
                    <span className="step-tag">
                      {isHindi ? `चरण ${item.step_number}` : `Step ${item.step_number}`}
                    </span>
                    <h4 className={`item-action-title ${isDone ? 'text-strikethrough' : ''}`}>
                      {item.action}
                    </h4>
                  </div>

                  {/* Metadata Chips: Deadline & Documents Needed */}
                  <div className="item-meta-chips">
                    {item.deadline && (() => {
                      const dlStatus = computeDeadlineStatus(item.deadline, isHindi);
                      return (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span className="meta-chip deadline-chip">
                            <Calendar size={12} />
                            <span>{isHindi ? 'अंतिम तिथि:' : 'Deadline:'} {item.deadline}</span>
                          </span>
                          {dlStatus && (
                            <span
                              className={`status-badge-toolbar ${
                                dlStatus.type === 'past'
                                  ? 'warning'
                                  : dlStatus.type === 'today' || dlStatus.type === 'soon'
                                  ? 'warning'
                                  : 'success'
                              }`}
                              style={{ fontSize: '11px', padding: '2px 8px' }}
                            >
                              {dlStatus.label}
                            </span>
                          )}
                        </div>
                      );
                    })()}

                    {item.documents_needed && item.documents_needed.length > 0 && (
                      <span className="meta-chip docs-chip">
                        <FileCheck2 size={12} />
                        <span>
                          {isHindi ? 'आवश्यक:' : 'Required:'}{' '}
                          {item.documents_needed.join(', ')}
                        </span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Evidence Drawer for Checklist Item */}
              {hasEvidence && (
                <div className="item-evidence-wrapper">
                  <button
                    type="button"
                    className="item-evidence-toggle"
                    onClick={() => toggleEvidence(item.id, firstEvidence)}
                    aria-expanded={isEvidenceOpen}
                  >
                    <Quote size={12} />
                    <span>{isHindi ? 'नोटिस साक्ष्य' : 'Notice Evidence'}</span>
                    {isEvidenceOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>

                  {isEvidenceOpen && (
                    <div className="item-evidence-drawer">
                      <blockquote className="item-evidence-quote">
                        "{firstEvidence}"
                      </blockquote>
                      {onHighlightEvidence && (
                        <button
                          type="button"
                          className="btn-highlight-source"
                          onClick={() => onHighlightEvidence(firstEvidence)}
                        >
                          <ExternalLink size={12} />
                          <span>{isHindi ? 'मूल पाठ में देखें' : 'View in Source'}</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};
