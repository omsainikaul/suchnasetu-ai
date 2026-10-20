import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Copy,
  Check,
  Search,
  X,
} from 'lucide-react';

interface OriginalNoticeViewerProps {
  ocrText: string;
  confidence: number;
  sourceType: string;
  currentLanguage: string;
  highlightSnippet?: string | null;
  onClearHighlight?: () => void;
}

export const OriginalNoticeViewer: React.FC<OriginalNoticeViewerProps> = ({
  ocrText,
  confidence,
  sourceType,
  currentLanguage,
  highlightSnippet,
  onClearHighlight,
}) => {
  const isHindi = currentLanguage === 'hi';
  const [searchTerm, setSearchTerm] = useState('');
  const [copied, setCopied] = useState(false);
  const [fontSize, setFontSize] = useState<'sm' | 'md' | 'lg'>('sm');
  const highlightedRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to highlighted evidence line when selected
  useEffect(() => {
    if (highlightSnippet && highlightedRef.current) {
      highlightedRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlightSnippet]);

  const handleCopy = () => {
    navigator.clipboard.writeText(ocrText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = ocrText.split('\n').filter(Boolean);

  const isLineHighlighted = (line: string): boolean => {
    if (!highlightSnippet) return false;
    const cleanLine = line.toLowerCase().trim();
    const cleanSnippet = highlightSnippet.toLowerCase().trim();
    return cleanLine.includes(cleanSnippet) || cleanSnippet.includes(cleanLine);
  };

  const isLineMatchedBySearch = (line: string): boolean => {
    if (!searchTerm.trim()) return false;
    return line.toLowerCase().includes(searchTerm.toLowerCase());
  };

  return (
    <div className="left-panel-viewer" aria-labelledby="viewer-heading">
      {/* Panel Top Header */}
      <div className="viewer-header">
        <div className="viewer-title-row">
          <FileText size={18} className="text-emerald-700" />
          <h3 id="viewer-heading" className="viewer-title">
            {isHindi ? 'मूल स्रोत एवं निष्कर्षित पाठ' : 'Original Source Notice & OCR'}
          </h3>
        </div>

        <div className="viewer-header-badges">
          <span className="source-type-pill">
            {sourceType === 'image'
              ? (isHindi ? 'RapidOCR प्रसंस्कृत' : 'RapidOCR Extracted')
              : (isHindi ? 'प्रत्यक्ष इनपुट पाठ' : 'Direct Notice Text')}
          </span>
          {sourceType === 'image' && (
            <span
              className={`confidence-pill ${confidence >= 0.8 ? 'conf-high' : 'conf-med'}`}
              title="Character Recognition Confidence Score"
            >
              OCR: {(confidence * 100).toFixed(0)}%
            </span>
          )}
        </div>
      </div>

      {/* Active Evidence Banner */}
      {highlightSnippet && (
        <div className="active-evidence-banner">
          <div className="evidence-banner-content">
            <span className="evidence-badge-tag">
              {isHindi ? 'सक्रिय साक्ष्य उद्धरण' : 'Active Evidence Citation'}
            </span>
            <p className="evidence-banner-quote">"{highlightSnippet}"</p>
          </div>
          {onClearHighlight && (
            <button
              type="button"
              className="clear-highlight-btn"
              onClick={onClearHighlight}
              title={isHindi ? 'साक्ष्य हाइलाइट हटाएं' : 'Clear highlight'}
              aria-label="Clear highlight"
            >
              <X size={15} />
            </button>
          )}
        </div>
      )}

      {/* Toolbar: Search, Text Size, Copy */}
      <div className="viewer-toolbar">
        <div className="search-input-wrap">
          <Search size={14} className="search-icon" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={isHindi ? 'मूल पाठ में खोजें...' : 'Search inside notice text...'}
            className="search-input"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="clear-search-btn"
              aria-label="Clear search"
            >
              <X size={13} />
            </button>
          )}
        </div>

        <div className="viewer-tools-group">
          {/* Font Size Adjuster */}
          <div className="font-size-group" role="group" aria-label="Font size">
            <button
              type="button"
              className={`font-size-btn ${fontSize === 'sm' ? 'active' : ''}`}
              onClick={() => setFontSize('sm')}
              title="Small font"
            >
              A
            </button>
            <button
              type="button"
              className={`font-size-btn ${fontSize === 'md' ? 'active' : ''}`}
              onClick={() => setFontSize('md')}
              title="Medium font"
            >
              A+
            </button>
          </div>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleCopy}
            title={isHindi ? 'पूरा पाठ कॉपी करें' : 'Copy complete notice text'}
          >
            {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
            <span>{copied ? (isHindi ? 'कॉपी हुआ' : 'Copied') : (isHindi ? 'कॉपी' : 'Copy')}</span>
          </button>
        </div>
      </div>

      {/* Line-Numbered Readable Document Box */}
      <div className={`source-text-container font-size-${fontSize}`} tabIndex={0} role="region" aria-label="Notice content text">
        {lines.map((line, idx) => {
          const highlighted = isLineHighlighted(line);
          const matched = isLineMatchedBySearch(line);

          return (
            <div
              key={idx}
              ref={highlighted ? highlightedRef : undefined}
              className={`source-line ${highlighted ? 'line-evidence-highlight' : ''} ${matched ? 'line-search-match' : ''}`}
            >
              <span className="line-number" aria-hidden="true">
                {(idx + 1).toString().padStart(2, '0')}
              </span>
              <span className="line-content">
                {line}
              </span>
            </div>
          );
        })}
      </div>

      {/* Viewer Footer Status */}
      <div className="viewer-footer">
        <span className="footer-metric">
          {lines.length} {isHindi ? 'पंक्तियां' : 'lines'} • {ocrText.length} {isHindi ? 'वर्ण' : 'characters'}
        </span>
        <span className="grounding-policy-note">
          {isHindi ? 'सख्त साक्ष्य सत्यापन' : 'Zero-Fabrication Policy'}
        </span>
      </div>
    </div>
  );
};
