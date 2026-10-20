import React, { useState } from 'react';
import { FileText, Copy, Check, Search } from 'lucide-react';

interface OriginalNoticeViewerProps {
  ocrText: string;
  confidence: number;
  sourceType: string;
  currentLanguage: string;
}

export const OriginalNoticeViewer: React.FC<OriginalNoticeViewerProps> = ({
  ocrText,
  confidence,
  sourceType,
  currentLanguage,
}) => {
  const isHindi = currentLanguage === 'hi';
  const [searchTerm, setSearchTerm] = useState('');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(ocrText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = ocrText.split('\n').filter(Boolean);

  return (
    <div className="card" style={{ marginBottom: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.85rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FileText size={18} className="text-emerald-700" />
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--slate-800)' }}>
            {isHindi ? 'मूल निष्कर्षित पाठ (OCR / स्रोत)' : 'Original Extracted Notice Text (Source)'}
          </h3>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.78rem', padding: '2px 8px', borderRadius: '9999px', backgroundColor: 'var(--slate-100)', color: 'var(--slate-700)', fontWeight: 600 }}>
            {sourceType === 'image' ? (isHindi ? 'RapidOCR प्रसंस्कृत' : 'RapidOCR Processed') : (isHindi ? 'प्रत्यक्ष पाठ' : 'Direct Text')}
          </span>
          {sourceType === 'image' && (
            <span style={{ fontSize: '0.78rem', padding: '2px 8px', borderRadius: '9999px', backgroundColor: confidence > 0.75 ? 'var(--success-bg)' : 'var(--warning-bg)', color: confidence > 0.75 ? 'var(--success-text)' : 'var(--warning-text)', fontWeight: 600 }}>
              OCR: {(confidence * 100).toFixed(0)}%
            </span>
          )}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleCopy}
            style={{ padding: '0.3rem 0.65rem', fontSize: '0.78rem' }}
          >
            {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
            <span>{copied ? (isHindi ? 'कॉपी हुआ' : 'Copied') : (isHindi ? 'कॉपी' : 'Copy')}</span>
          </button>
        </div>
      </div>

      {/* Filter / Search inside notice */}
      <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
        <Search size={15} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--slate-400)' }} />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={isHindi ? 'मूल नोटिस में खोजें...' : 'Search inside original notice text...'}
          style={{
            width: '100%',
            padding: '0.45rem 0.65rem 0.45rem 2rem',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--slate-300)',
            fontSize: '0.84rem',
            color: 'var(--slate-800)',
          }}
        />
      </div>

      <div
        style={{
          maxHeight: '220px',
          overflowY: 'auto',
          backgroundColor: 'var(--slate-50)',
          border: '1px solid var(--slate-200)',
          borderRadius: 'var(--radius-sm)',
          padding: '0.75rem',
          fontSize: '0.84rem',
          fontFamily: 'monospace',
          lineHeight: 1.5,
          color: 'var(--slate-700)',
          whiteSpace: 'pre-wrap',
        }}
      >
        {searchTerm ? (
          lines
            .filter((l) => l.toLowerCase().includes(searchTerm.toLowerCase()))
            .map((line, idx) => (
              <p key={idx} style={{ backgroundColor: '#fef08a', padding: '2px 4px', borderRadius: '2px', marginBottom: '3px' }}>
                {line}
              </p>
            ))
        ) : (
          ocrText
        )}
      </div>
      <p style={{ fontSize: '0.74rem', color: 'var(--slate-400)', marginTop: '0.4rem', textAlign: 'right' }}>
        {lines.length} {isHindi ? 'पंक्तियाँ' : 'lines'} • {ocrText.length} {isHindi ? 'अक्षर' : 'characters'}
      </p>
    </div>
  );
};
