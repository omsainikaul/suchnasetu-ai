import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Copy, Check, AlertTriangle, BookOpen } from 'lucide-react';
import type { NoticeAnalysisResult } from '../types';

interface SummaryCardProps {
  result: NoticeAnalysisResult;
  currentLanguage: string;
}

export const SummaryCard: React.FC<SummaryCardProps> = ({ result, currentLanguage }) => {
  const isHindi = currentLanguage === 'hi';
  const [isPlaying, setIsPlaying] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Stop speech if component unmounts or language changes
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [currentLanguage]);

  const handleSpeak = () => {
    if (!('speechSynthesis' in window)) {
      alert(isHindi ? 'आपके ब्राउज़र में वाक् संश्लेषण (Speech Synthesis) समर्थित नहीं है।' : 'Speech synthesis is not supported in your browser.');
      return;
    }

    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(result.summary);
    utterance.lang = isHindi ? 'hi-IN' : 'en-US';
    utterance.rate = 0.95;

    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);

    setIsPlaying(true);
    window.speechSynthesis.speak(utterance);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(`${result.notice_title}\n\n${result.summary}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="card" style={{ marginBottom: '1.5rem', borderLeft: '4px solid var(--primary-600)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.75rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span className="badge badge-model">
              <BookOpen size={13} />
              <span>{result.reading_level === 'simpler' ? (isHindi ? 'सरल भाषा संस्करण' : 'Simpler Reading Level') : (isHindi ? 'मानक सारांश' : 'Plain-Language Summary')}</span>
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--slate-500)' }}>
              Doc ID: {result.document_id}
            </span>
          </div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--slate-900)' }}>
            {result.notice_title}
          </h3>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleSpeak}
            style={{ padding: '0.4rem 0.75rem', fontSize: '0.82rem' }}
            title={isHindi ? 'सारांश बोलकर सुनाएं' : 'Read summary aloud'}
            aria-label={isPlaying ? 'Stop audio' : 'Read aloud'}
          >
            {isPlaying ? <VolumeX size={15} className="text-red-600" /> : <Volume2 size={15} className="text-emerald-700" />}
            <span>{isPlaying ? (isHindi ? 'रोकें' : 'Stop') : (isHindi ? 'बोलकर सुनाएं' : 'Read Aloud')}</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleCopy}
            style={{ padding: '0.4rem 0.75rem', fontSize: '0.82rem' }}
            title={isHindi ? 'कॉपी करें' : 'Copy summary'}
          >
            {copied ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />}
            <span>{copied ? (isHindi ? 'कॉपी हुआ' : 'Copied') : (isHindi ? 'कॉपी' : 'Copy')}</span>
          </button>
        </div>
      </div>

      <div style={{ fontSize: '0.96rem', lineHeight: 1.6, color: 'var(--slate-700)', backgroundColor: 'var(--slate-50)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--slate-200)' }}>
        <p style={{ whiteSpace: 'pre-line' }}>{result.summary}</p>
      </div>

      {result.limitations && result.limitations.length > 0 && (
        <div style={{ marginTop: '0.85rem', display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.65rem 0.85rem', backgroundColor: 'var(--warning-bg)', border: '1px solid var(--warning-border)', borderRadius: 'var(--radius-sm)', color: 'var(--warning-text)', fontSize: '0.82rem' }}>
          <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <span style={{ fontWeight: 600 }}>{isHindi ? 'ध्यान देने योग्य बिंदु:' : 'Important Limitations / Caveats:'} </span>
            <span>{result.limitations.join(' • ')}</span>
          </div>
        </div>
      )}
    </div>
  );
};
