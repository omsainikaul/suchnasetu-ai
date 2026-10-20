import React, { useState } from 'react';
import { MessageSquare, Send, CheckCircle2, AlertOctagon } from 'lucide-react';
import { askQuestion } from '../services/api';
import type { AskResponse } from '../types';

interface FollowUpQAProps {
  documentId: string;
  currentLanguage: string;
}

export const FollowUpQA: React.FC<FollowUpQAProps> = ({ documentId, currentLanguage }) => {
  const isHindi = currentLanguage === 'hi';
  const [question, setQuestion] = useState('');
  const [qaHistory, setQaHistory] = useState<AskResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const presetChips = isHindi
    ? [
        'पात्रता मानदंड क्या हैं?',
        'आवेदन की अंतिम तिथि क्या है?',
        'कौन-से दस्तावेज आवश्यक हैं?',
        'क्या आय प्रमाण पत्र अनिवार्य है?',
        'आवेदन कहाँ जमा करना है?'
      ]
    : [
        'Who is eligible to apply?',
        'What is the submission deadline?',
        'Which documents are required?',
        'Is an income certificate required?',
        'Where should I submit the application?'
      ];

  const handleAsk = async (queryText?: string) => {
    const q = (queryText || question).trim();
    if (!q) return;

    setLoading(true);
    setError(null);
    try {
      const resp = await askQuestion({
        documentId,
        question: q,
        language: currentLanguage
      });
      setQaHistory(prev => [resp, ...prev]);
      if (!queryText) setQuestion('');
    } catch (err: any) {
      setError(err.message || 'Failed to answer question');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="card" style={{ marginBottom: '2rem' }} aria-labelledby="qa-section-heading">
      <div style={{ marginBottom: '1rem' }}>
        <h3 id="qa-section-heading" style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--slate-800)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <MessageSquare size={20} className="text-emerald-700" />
          <span>{isHindi ? 'नोटिस-आधारित प्रश्नोत्तर (Grounded Q&A)' : 'Notice-Grounded Q&A Assistant'}</span>
        </h3>
        <p style={{ fontSize: '0.84rem', color: 'var(--slate-500)', marginTop: '0.2rem' }}>
          {isHindi
            ? 'केवल नोटिस में दिए गए तथ्यों के आधार पर उत्तर दिए जाते हैं। बाहरी ज्ञान से अनुमान नहीं लगाया जाता।'
            : 'Answers strictly from notice facts. If information is absent, the system explicitly states it is not stated.'}
        </p>
      </div>

      {/* Preset Chips */}
      <div style={{ marginBottom: '1rem' }}>
        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--slate-600)', display: 'block', marginBottom: '0.4rem' }}>
          {isHindi ? 'त्वरित प्रश्न:' : 'Common Quick Queries:'}
        </span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
          {presetChips.map((chip, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleAsk(chip)}
              disabled={loading}
              style={{
                fontSize: '0.8rem',
                padding: '0.3rem 0.65rem',
                borderRadius: '9999px',
                border: '1px solid var(--slate-300)',
                backgroundColor: 'var(--slate-50)',
                color: 'var(--slate-700)',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              title={chip.includes('income') || chip.includes('आय') ? (isHindi ? 'लापता तथ्य का परीक्षण' : 'Tests absent requirement rejection') : undefined}
            >
              <span>{chip}</span>
              {(chip.includes('income') || chip.includes('आय')) && (
                <span style={{ marginLeft: '4px', fontSize: '0.68rem', color: '#b45309' }}>• Test Absent</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Ask Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleAsk();
        }}
        style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}
      >
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={isHindi ? 'नोटिस के बारे में कोई भी प्रश्न पूछें...' : 'Ask any question grounded in the notice...'}
          style={{
            flex: 1,
            padding: '0.65rem 0.85rem',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--slate-300)',
            fontSize: '0.92rem',
            color: 'var(--slate-800)',
          }}
          disabled={loading}
        />
        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading || !question.trim()}
          style={{ padding: '0.65rem 1.25rem' }}
        >
          <Send size={16} />
          <span>{loading ? (isHindi ? 'पूछ रहे हैं...' : 'Asking...') : (isHindi ? 'पूछें' : 'Ask')}</span>
        </button>
      </form>

      {error && (
        <div style={{ marginBottom: '1rem', padding: '0.65rem', backgroundColor: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-sm)', color: 'var(--danger-text)', fontSize: '0.84rem' }}>
          {error}
        </div>
      )}

      {/* Q&A Thread History */}
      {qaHistory.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {qaHistory.map((qa, index) => {
            const isNotStated = !qa.is_stated_in_notice || qa.status === 'not_stated_in_notice';

            return (
              <div
                key={index}
                style={{
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: isNotStated ? '#fffbeb' : '#ffffff',
                  border: isNotStated ? '1px solid #fde68a' : '1px solid var(--slate-200)',
                  boxShadow: 'var(--shadow-sm)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.4rem' }}>
                  <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--slate-800)' }}>
                    Q: {qa.question}
                  </h4>
                  {isNotStated ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: '9999px', backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }}>
                      <AlertOctagon size={12} />
                      <span>{isHindi ? 'नोटिस में नहीं है' : 'Not stated in notice'}</span>
                    </span>
                  ) : (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: '9999px', backgroundColor: 'var(--success-bg)', color: 'var(--success-text)', border: '1px solid var(--success-border)' }}>
                      <CheckCircle2 size={12} />
                      <span>{isHindi ? 'साक्ष्य आधारित' : 'Evidence grounded'}</span>
                    </span>
                  )}
                </div>

                <p style={{ fontSize: '0.9rem', color: isNotStated ? '#92400e' : 'var(--slate-700)', lineHeight: 1.5, fontWeight: isNotStated ? 600 : 400 }}>
                  {qa.answer}
                </p>

                {/* Evidence snippet */}
                {qa.evidence && qa.evidence.length > 0 && (
                  <div style={{ marginTop: '0.5rem', padding: '0.5rem', backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: '4px', borderLeft: '3px solid var(--primary-600)', fontSize: '0.78rem', color: 'var(--slate-600)' }}>
                    <span style={{ fontWeight: 600, color: 'var(--slate-500)', display: 'block', marginBottom: '2px' }}>
                      {isHindi ? 'समर्थक साक्ष्य पंक्ति:' : 'Supporting Notice Fragment:'}
                    </span>
                    <p style={{ fontStyle: 'italic' }}>
                      "{qa.evidence[0]}"
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
