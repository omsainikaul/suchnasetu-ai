import React, { useState } from 'react';
import { ListOrdered, CheckSquare, Square, Calendar, FileText, AlertCircle, Quote } from 'lucide-react';
import type { ChecklistItem } from '../types';

interface ActionChecklistProps {
  checklist: ChecklistItem[];
  currentLanguage: string;
}

export const ActionChecklist: React.FC<ActionChecklistProps> = ({ checklist, currentLanguage }) => {
  const isHindi = currentLanguage === 'hi';
  const [completedItems, setCompletedItems] = useState<Record<string, boolean>>({});

  const toggleItem = (id: string) => {
    setCompletedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const completedCount = Object.values(completedItems).filter(Boolean).length;
  const totalCount = checklist.length;

  return (
    <section className="card" style={{ marginBottom: '2rem' }} aria-labelledby="checklist-heading">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
        <div>
          <h3 id="checklist-heading" style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--slate-800)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ListOrdered size={20} className="text-emerald-700" />
            <span>{isHindi ? 'क्रमबद्ध कार्य योजना (चेकलिस्ट)' : 'Ordered Action Checklist'}</span>
          </h3>
          <p style={{ fontSize: '0.84rem', color: 'var(--slate-500)', marginTop: '0.2rem' }}>
            {isHindi ? 'नोटिस के आधार पर तैयार किए गए व्यावहारिक चरणबद्ध कदम।' : 'Practical, chronological next steps derived directly from the notice.'}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary-800)', backgroundColor: 'var(--primary-50)', padding: '0.3rem 0.75rem', borderRadius: '9999px', border: '1px solid var(--primary-200)' }}>
            {completedCount} / {totalCount} {isHindi ? 'पूर्ण' : 'Completed'}
          </span>
        </div>
      </div>

      {/* Official Submission Disclaimer Note (Requirement R4) */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.65rem 0.85rem', backgroundColor: 'var(--slate-50)', border: '1px solid var(--slate-200)', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem', fontSize: '0.8rem', color: 'var(--slate-600)' }}>
        <AlertCircle size={15} className="text-slate-500" style={{ flexShrink: 0, marginTop: '2px' }} />
        <span>
          {isHindi
            ? 'सूचना: चेकलिस्ट पर टिक लगाना केवल आपकी व्यक्तिगत तैयारी को ट्रैक करने के लिए है। यह आधिकारिक आवेदन या जमा की पुष्टि नहीं करता है।'
            : 'Important: Marking an item complete tracks your personal preparation. It does NOT constitute official submission or filing of your application.'}
        </span>
      </div>

      {/* Checklist Items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        {checklist.map((item) => {
          const isDone = !!completedItems[item.id];

          return (
            <div
              key={item.id}
              onClick={() => toggleItem(item.id)}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.85rem',
                padding: '1rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: isDone ? 'var(--primary-50)' : '#ffffff',
                border: isDone ? '1px solid var(--primary-300)' : '1px solid var(--slate-200)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
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
              <div style={{ color: isDone ? 'var(--primary-700)' : 'var(--slate-400)', marginTop: '2px', flexShrink: 0 }}>
                {isDone ? <CheckSquare size={20} /> : <Square size={20} />}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--slate-500)', textTransform: 'uppercase' }}>
                    {isHindi ? `कदम ${item.step_number}:` : `Step ${item.step_number}:`}
                  </span>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: isDone ? 'var(--primary-900)' : 'var(--slate-800)', textDecoration: isDone ? 'line-through' : 'none' }}>
                    {item.action}
                  </h4>
                </div>

                {/* Deadline & Documents Pills */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
                  {item.deadline && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.76rem', fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: '4px', backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>
                      <Calendar size={12} />
                      <span>{isHindi ? 'अंतिम तिथि:' : 'Deadline:'} {item.deadline}</span>
                    </span>
                  )}

                  {item.documents_needed && item.documents_needed.length > 0 && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.76rem', fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: '4px', backgroundColor: '#f5f3ff', color: '#5b21b6', border: '1px solid #ddd6fe' }}>
                      <FileText size={12} />
                      <span>{isHindi ? 'आवश्यक दस्तावेज:' : 'Docs:'} {item.documents_needed.join(', ')}</span>
                    </span>
                  )}
                </div>

                {/* Evidence Quote */}
                {item.evidence && item.evidence.length > 0 && (
                  <p style={{ fontSize: '0.76rem', fontStyle: 'italic', color: 'var(--slate-500)', marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Quote size={11} className="text-slate-400" />
                    <span>"{item.evidence[0]}"</span>
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
