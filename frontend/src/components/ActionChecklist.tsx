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

interface ActionChecklistProps {
  checklist: ChecklistItem[];
  currentLanguage: string;
  onHighlightEvidence?: (evidenceSnippet: string) => void;
}

export const ActionChecklist: React.FC<ActionChecklistProps> = ({
  checklist,
  currentLanguage,
  onHighlightEvidence,
}) => {
  const isHindi = currentLanguage === 'hi';
  const [completedItems, setCompletedItems] = useState<Record<string, boolean>>({});
  const [expandedEvidence, setExpandedEvidence] = useState<Record<string, boolean>>({});

  const toggleItem = (id: string) => {
    setCompletedItems((prev) => ({ ...prev, [id]: !prev[id] }));
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
                    {item.deadline && (
                      <span className="meta-chip deadline-chip">
                        <Calendar size={12} />
                        <span>{isHindi ? 'अंतिम तिथि:' : 'Deadline:'} {item.deadline}</span>
                      </span>
                    )}

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
