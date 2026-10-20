import React, { useState, useEffect } from 'react';
import {
  Volume2,
  VolumeX,
  Pause,
  Copy,
  Check,
  AlertTriangle,
  BookOpen,
} from 'lucide-react';
import type { NoticeAnalysisResult } from '../types';

interface SummaryCardProps {
  result: NoticeAnalysisResult;
  currentLanguage: string;
}

export const SummaryCard: React.FC<SummaryCardProps> = ({ result, currentLanguage }) => {
  const isHindi = currentLanguage === 'hi';
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [copied, setCopied] = useState(false);
  const speechRate = 0.95;

  useEffect(() => {
    // Cancel any active speech synthesis on language change or unmount
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [currentLanguage]);

  const handleSpeak = () => {
    if (!('speechSynthesis' in window)) {
      alert(
        isHindi
          ? 'आपके ब्राउज़र में वाक् संश्लेषण (Speech Synthesis) समर्थित नहीं है।'
          : 'Speech synthesis is not supported in this browser.'
      );
      return;
    }

    if (isPlaying) {
      if (isPaused) {
        window.speechSynthesis.resume();
        setIsPaused(false);
      } else {
        window.speechSynthesis.pause();
        setIsPaused(true);
      }
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(result.summary);
    utterance.lang = isHindi ? 'hi-IN' : 'en-US';
    utterance.rate = speechRate;

    utterance.onstart = () => {
      setIsPlaying(true);
      setIsPaused(false);
    };

    utterance.onend = () => {
      setIsPlaying(false);
      setIsPaused(false);
    };

    utterance.onerror = () => {
      setIsPlaying(false);
      setIsPaused(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  const handleStopSpeech = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      setIsPaused(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(`${result.notice_title}\n\n${result.summary}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <article className="summary-card" aria-labelledby="summary-card-heading">
      {/* Summary Header */}
      <div className="summary-header">
        <div className="summary-title-meta">
          <div className="summary-badges-row">
            <span className="reading-level-chip">
              <BookOpen size={13} />
              <span>
                {result.reading_level === 'simpler'
                  ? (isHindi ? 'सरल भाषा संस्करण (Easy Read)' : 'Simpler Reading Level (Easy Read)')
                  : (isHindi ? 'मानक सुलभ सारांश' : 'Plain-Language Summary')}
              </span>
            </span>
            <span className="doc-pill">
              ID: {result.document_id}
            </span>
          </div>
          <h3 id="summary-card-heading" className="summary-headline">
            {result.notice_title}
          </h3>
        </div>

        {/* Audio Speech Controls & Copy */}
        <div className="summary-actions">
          <div className="tts-control-pill" role="group" aria-label="Audio read aloud controls">
            <button
              type="button"
              className={`btn-tts-action ${isPlaying ? 'tts-active' : ''}`}
              onClick={handleSpeak}
              title={
                isPlaying
                  ? (isPaused ? (isHindi ? 'पुनः शुरू करें' : 'Resume') : (isHindi ? 'रोकें' : 'Pause'))
                  : (isHindi ? 'बोलकर सुनाएं' : 'Read Aloud')
              }
              aria-label={isPlaying ? (isPaused ? 'Resume speech' : 'Pause speech') : 'Read aloud'}
            >
              {isPlaying && !isPaused ? (
                <Pause size={15} className="text-amber-700" />
              ) : (
                <Volume2 size={15} className="text-emerald-700" />
              )}
              <span>
                {isPlaying
                  ? (isPaused ? (isHindi ? 'पुनः शुरू' : 'Resume') : (isHindi ? 'विराम' : 'Pause'))
                  : (isHindi ? 'बोलकर सुनें' : 'Read Aloud')}
              </span>
            </button>

            {isPlaying && (
              <button
                type="button"
                className="btn-tts-stop"
                onClick={handleStopSpeech}
                title={isHindi ? 'ऑडियो बंद करें' : 'Stop audio'}
                aria-label="Stop audio"
              >
                <VolumeX size={14} />
              </button>
            )}
          </div>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleCopy}
            title={isHindi ? 'सारांश कॉपी करें' : 'Copy summary'}
          >
            {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
            <span>{copied ? (isHindi ? 'कॉपी हुआ' : 'Copied') : (isHindi ? 'कॉपी' : 'Copy')}</span>
          </button>
        </div>
      </div>

      {/* Summary Content Body */}
      <div className={`summary-body ${isHindi ? 'font-devanagari' : ''}`}>
        <p className="summary-text">{result.summary}</p>
      </div>

      {/* Limitations / Caveats (e.g. OCR quality or truncation notes) */}
      {result.limitations && result.limitations.length > 0 && (
        <div className="limitations-banner">
          <AlertTriangle size={15} className="limitations-icon" />
          <div className="limitations-content">
            <strong className="limitations-label">
              {isHindi ? 'महत्वपूर्ण सीमाएं / ध्यातव्य बिंदु:' : 'Important Notice Limitations & Caveats:'}
            </strong>{' '}
            <span className="limitations-text">{result.limitations.join(' • ')}</span>
          </div>
        </div>
      )}
    </article>
  );
};
