import React, { useState } from 'react';
import {
  MessageSquare,
  Send,
  CheckCircle2,
  AlertOctagon,
  Quote,
  ExternalLink,
  HelpCircle,
} from 'lucide-react';
import { askQuestion } from '../services/api';
import type { AskResponse } from '../types';

interface FollowUpQAProps {
  documentId: string;
  currentLanguage: string;
  onHighlightEvidence?: (evidenceSnippet: string) => void;
}

export const FollowUpQA: React.FC<FollowUpQAProps> = ({
  documentId,
  currentLanguage,
  onHighlightEvidence,
}) => {
  const isHindi = currentLanguage === 'hi';
  const [question, setQuestion] = useState('');
  const [qaHistory, setQaHistory] = useState<AskResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const presetChips = isHindi
    ? [
        { text: 'क्या आय प्रमाण पत्र अनिवार्य है?', isAbsentTest: true, hint: 'लापता आवश्यकता परीक्षण' },
        { text: 'पात्रता मानदंड क्या हैं?', isAbsentTest: false },
        { text: 'आवेदन की अंतिम तिथि क्या है?', isAbsentTest: false },
        { text: 'कौन-से दस्तावेज संलग्न करने हैं?', isAbsentTest: false },
        { text: 'आवेदन कहाँ जमा करना है?', isAbsentTest: false },
      ]
    : [
        { text: 'Is an income certificate required?', isAbsentTest: true, hint: 'Tests Absent Rejection' },
        { text: 'Who is eligible to apply?', isAbsentTest: false },
        { text: 'What is the submission deadline?', isAbsentTest: false },
        { text: 'Which documents must be attached?', isAbsentTest: false },
        { text: 'Where should the application be submitted?', isAbsentTest: false },
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
        language: currentLanguage,
      });
      setQaHistory((prev) => [resp, ...prev]);
      if (!queryText) setQuestion('');
    } catch (err: any) {
      setError(err.message || (isHindi ? 'प्रश्न का उत्तर देने में असमर्थ।' : 'Failed to answer question'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="qa-card" aria-labelledby="qa-section-heading">
      {/* Q&A Section Header */}
      <div className="qa-header">
        <div className="qa-title-row">
          <MessageSquare size={20} className="text-emerald-700" />
          <h3 id="qa-section-heading" className="qa-title">
            {isHindi ? 'नोटिस-आधारित अनुवर्ती प्रश्नोत्तर' : 'Grounded Notice Follow-up Assistant'}
          </h3>
        </div>
        <p className="qa-subtitle">
          {isHindi
            ? 'केवल इस परिपत्र के तथ्यों पर आधारित उत्तर। यदि कोई जानकारी नोटिस में नहीं है, तो सिस्टम स्पष्ट रूप से बताएगा कि यह जानकारी उल्लेखित नहीं है।'
            : 'Answers are strictly grounded in this notice. The system explicitly refuses to invent facts that are absent from the document.'}
        </p>
      </div>

      {/* Suggested Quick Question Chips */}
      <div className="suggested-queries-block">
        <span className="queries-label">
          {isHindi ? 'सुझाए गए त्वरित प्रश्न (PS 02 परीक्षण):' : 'Suggested Questions (PS 02 Grounding Tests):'}
        </span>
        <div className="query-chips-row">
          {presetChips.map((chip, idx) => (
            <button
              key={idx}
              type="button"
              className={`query-chip ${chip.isAbsentTest ? 'chip-absent-test' : ''}`}
              onClick={() => handleAsk(chip.text)}
              disabled={loading}
              title={chip.isAbsentTest ? (isHindi ? 'प्रमाणित करता है कि लापता तथ्य कभी नहीं गढ़े जाते' : 'Demonstrates system rejecting an absent requirement') : undefined}
            >
              <span>{chip.text}</span>
              {chip.isAbsentTest && (
                <span className="absent-test-tag">
                  {chip.hint}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Question Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleAsk();
        }}
        className="qa-input-form"
      >
        <div className="qa-input-wrapper">
          <input
            type="text"
            className="qa-input-field"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={
              isHindi
                ? 'इस नोटिस के बारे में कोई भी प्रश्न पूछें (उदा. क्या कोई शुल्क लागू है?)...'
                : 'Ask anything about this notice (e.g. Is there an application fee?)...'
            }
            disabled={loading}
          />
          <button
            type="submit"
            className="btn btn-primary qa-send-btn"
            disabled={loading || !question.trim()}
            aria-label="Send question"
          >
            {loading ? (
              <span className="spinner-sm" />
            ) : (
              <>
                <span>{isHindi ? 'पूछें' : 'Ask'}</span>
                <Send size={15} />
              </>
            )}
          </button>
        </div>
      </form>

      {/* Error Banner */}
      {error && (
        <div className="qa-error-banner" role="alert">
          <AlertOctagon size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Q&A Response Thread */}
      {qaHistory.length > 0 && (
        <div className="qa-history-stack">
          {qaHistory.map((item, idx) => {
            const isAbsent = !item.is_stated_in_notice || item.status === 'not_stated_in_notice';
            const hasEvidence = item.evidence && item.evidence.length > 0;
            const evidenceSnippet = hasEvidence ? item.evidence[0] : '';

            return (
              <article key={idx} className={`qa-item-card ${isAbsent ? 'qa-item-absent' : 'qa-item-grounded'}`}>
                {/* Question */}
                <div className="qa-question-row">
                  <span className="qa-q-badge">Q</span>
                  <h4 className="qa-question-text">{item.question}</h4>
                </div>

                {/* Answer */}
                <div className="qa-answer-row">
                  <div className="qa-answer-main">
                    <div className="qa-answer-header">
                      {isAbsent ? (
                        <span className="qa-status-pill status-absent">
                          <HelpCircle size={13} />
                          <span>{isHindi ? 'नोटिस में उल्लेखित नहीं' : 'Not Stated in Notice'}</span>
                        </span>
                      ) : (
                        <span className="qa-status-pill status-found">
                          <CheckCircle2 size={13} />
                          <span>{isHindi ? 'नोटिस में सत्यापित' : 'Grounded in Notice'}</span>
                        </span>
                      )}
                    </div>

                    <p className="qa-answer-body">{item.answer}</p>

                    {/* Supporting Evidence Citation */}
                    {hasEvidence && (
                      <div className="qa-evidence-box">
                        <div className="qa-evidence-top">
                          <Quote size={12} className="text-emerald-700" />
                          <span className="qa-evidence-label">
                            {isHindi ? 'समर्थक साक्ष्य (नोटिस से):' : 'Supporting Evidence Citation:'}
                          </span>
                        </div>
                        <blockquote className="qa-evidence-quote">
                          "{evidenceSnippet}"
                        </blockquote>
                        {onHighlightEvidence && (
                          <button
                            type="button"
                            className="btn-highlight-source"
                            onClick={() => onHighlightEvidence(evidenceSnippet)}
                          >
                            <ExternalLink size={12} />
                            <span>{isHindi ? 'मूल पाठ में देखें' : 'View in Source'}</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};
