import React, { useState, useRef } from 'react';
import { Upload, FileText, Image as ImageIcon, CheckCircle, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';
import type { DemoNotice } from '../types';

interface NoticeInputSectionProps {
  onAnalyze: (params: { file?: File | null; text?: string; language: string; readingLevel: string }) => void;
  isLoading: boolean;
  demoNotices: DemoNotice[];
  currentLanguage: string;
  onLanguageChange?: (lang: string) => void;
}

export const NoticeInputSection: React.FC<NoticeInputSectionProps> = ({
  onAnalyze,
  isLoading,
  demoNotices,
  currentLanguage,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pastedText, setPastedText] = useState<string>('');
  const [readingLevel, setReadingLevel] = useState<'standard' | 'simpler'>('standard');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isHindi = currentLanguage === 'hi';

  const handleFileChange = (file: File) => {
    setErrorMsg(null);
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setErrorMsg(isHindi ? 'अमान्य फ़ाइल प्रकार। कृपया PNG, JPEG या WebP छवि अपलोड करें।' : 'Invalid file type. Please upload PNG, JPEG or WebP images.');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setErrorMsg(isHindi ? 'फ़ाइल का आकार 15MB से अधिक है।' : 'File size exceeds 15MB limit.');
      return;
    }
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleDemoSelect = (demo: DemoNotice) => {
    setErrorMsg(null);
    setActiveTab('paste');
    setPastedText(demo.sample_text);
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (activeTab === 'upload') {
      if (!selectedFile) {
        setErrorMsg(isHindi ? 'कृपया विश्लेषण हेतु एक नोटिस छवि अपलोड करें।' : 'Please upload a notice image to analyze.');
        return;
      }
      onAnalyze({ file: selectedFile, language: currentLanguage, readingLevel });
    } else {
      if (!pastedText.trim()) {
        setErrorMsg(isHindi ? 'कृपया विश्लेषण हेतु नोटिस का पाठ पेस्ट करें।' : 'Please paste the notice text to analyze.');
        return;
      }
      onAnalyze({ text: pastedText, language: currentLanguage, readingLevel });
    }
  };

  return (
    <section className="card" aria-labelledby="input-section-heading">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
        <div>
          <h2 id="input-section-heading" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--slate-800)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={20} className="text-emerald-700" />
            <span>{isHindi ? 'नोटिस अपलोड या पेस्ट करें' : 'Provide Notice Document'}</span>
          </h2>
          <p style={{ fontSize: '0.88rem', color: 'var(--slate-500)', marginTop: '0.2rem' }}>
            {isHindi ? 'किसी भी सरकारी, विश्वविद्यालय या संस्थागत नोटिस को समझने योग्य चरणों में बदलें।' : 'Upload a screenshot or photo of an official circular, or paste the notice text.'}
          </p>
        </div>

        {/* Reading Level Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label htmlFor="reading-level" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--slate-600)' }}>
            {isHindi ? 'पठन स्तर:' : 'Reading Level:'}
          </label>
          <select
            id="reading-level"
            value={readingLevel}
            onChange={(e) => setReadingLevel(e.target.value as 'standard' | 'simpler')}
            style={{
              padding: '0.4rem 0.75rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--slate-300)',
              fontSize: '0.85rem',
              fontWeight: 500,
              backgroundColor: '#ffffff',
              color: 'var(--slate-800)'
            }}
          >
            <option value="standard">{isHindi ? 'मानक (Standard)' : 'Standard (Detailed)'}</option>
            <option value="simpler">{isHindi ? 'सरल भाषा (Simpler / Easy Read)' : 'Simpler / Easy Read'}</option>
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs-header" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'upload'}
          className={`tab-btn ${activeTab === 'upload' ? 'active' : ''}`}
          onClick={() => setActiveTab('upload')}
        >
          <ImageIcon size={17} />
          <span>{isHindi ? 'छवि अपलोड (OCR)' : 'Upload Image (OCR)'}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'paste'}
          className={`tab-btn ${activeTab === 'paste' ? 'active' : ''}`}
          onClick={() => setActiveTab('paste')}
        >
          <FileText size={17} />
          <span>{isHindi ? 'पाठ पेस्ट करें' : 'Paste Notice Text'}</span>
        </button>
      </div>

      {/* Quick Demo Notice Presets */}
      <div style={{ marginBottom: '1.25rem', padding: '0.75rem 1rem', backgroundColor: 'var(--teal-50)', borderRadius: 'var(--radius-md)', border: '1px solid var(--primary-100)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary-800)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Sparkles size={14} />
            <span>{isHindi ? 'आधिकारिक डेमो नोटिस (परीक्षण हेतु)' : 'Official Demo Notice Presets'}</span>
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--slate-500)' }}>
            {isHindi ? 'एक क्लिक में लोड करें' : 'Load realistic test cases in 1 click'}
          </span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {demoNotices.map((demo) => (
            <button
              key={demo.id}
              type="button"
              onClick={() => handleDemoSelect(demo)}
              style={{
                fontSize: '0.82rem',
                fontWeight: 600,
                padding: '0.35rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--primary-200)',
                backgroundColor: '#ffffff',
                color: 'var(--primary-800)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                transition: 'all 0.15s ease'
              }}
              title={demo.description}
            >
              <span>{isHindi ? demo.title_hi : demo.title}</span>
              {demo.has_missing_field && (
                <span style={{ fontSize: '0.7rem', padding: '1px 5px', borderRadius: '4px', backgroundColor: '#fee2e2', color: '#991b1b' }}>
                  {isHindi ? 'लापता तथ्य' : 'Missing Field'}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Form Content */}
      <form onSubmit={handleSubmit}>
        {activeTab === 'upload' ? (
          <div>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: '2px dashed var(--slate-300)',
                borderRadius: 'var(--radius-lg)',
                padding: '2.5rem 1.5rem',
                textAlign: 'center',
                backgroundColor: 'var(--slate-50)',
                cursor: 'pointer',
                transition: 'border-color 0.2s ease, background-color 0.2s ease',
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                style={{ display: 'none' }}
                onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
              />
              <Upload size={38} style={{ margin: '0 auto 0.75rem auto', color: 'var(--primary-600)' }} />
              <p style={{ fontWeight: 600, color: 'var(--slate-700)', fontSize: '0.95rem' }}>
                {isHindi ? 'छवि यहाँ खींचें या चुनने के लिए क्लिक करें' : 'Drag & drop notice photo or click to browse'}
              </p>
              <p style={{ fontSize: '0.8rem', color: 'var(--slate-500)', marginTop: '0.3rem' }}>
                PNG, JPEG, WebP • {isHindi ? 'अधिकतम 15MB' : 'Max 15MB'}
              </p>

              {selectedFile && (
                <div style={{ marginTop: '1rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.85rem', backgroundColor: '#ffffff', borderRadius: 'var(--radius-sm)', border: '1px solid var(--primary-200)', color: 'var(--primary-800)', fontSize: '0.85rem', fontWeight: 600 }}>
                  <CheckCircle size={16} className="text-emerald-600" />
                  <span>{selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                </div>
              )}
            </div>

            {previewUrl && (
              <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem', backgroundColor: 'var(--slate-100)', borderRadius: 'var(--radius-md)' }}>
                <img
                  src={previewUrl}
                  alt="Notice Preview"
                  style={{ maxHeight: '90px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--slate-300)' }}
                />
                <div style={{ fontSize: '0.85rem', color: 'var(--slate-600)' }}>
                  <p style={{ fontWeight: 600, color: 'var(--slate-800)' }}>{selectedFile?.name}</p>
                  <p>{isHindi ? 'RapidOCR द्वारा पाठ निकाला जाएगा' : 'Ready for OCR character recognition'}</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div>
            <textarea
              rows={8}
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder={isHindi ? 'यहाँ आधिकारिक नोटिस या परिपत्र का पूरा पाठ पेस्ट करें...' : 'Paste the full text of the circular, announcement, or notice here...'}
              style={{
                width: '100%',
                padding: '0.85rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--slate-300)',
                fontFamily: 'inherit',
                fontSize: '0.9rem',
                lineHeight: 1.5,
                color: 'var(--slate-800)',
                resize: 'vertical',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.4rem', fontSize: '0.78rem', color: 'var(--slate-500)' }}>
              <span>{isHindi ? 'प्रत्यक्ष पाठ निष्कर्षण (बिना OCR)' : 'Direct text analysis (No OCR needed)'}</span>
              <span>{pastedText.split(/\s+/).filter(Boolean).length} {isHindi ? 'शब्द' : 'words'}</span>
            </div>
          </div>
        )}

        {errorMsg && (
          <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 0.85rem', backgroundColor: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-sm)', color: 'var(--danger-text)', fontSize: '0.85rem' }}>
            <AlertCircle size={17} />
            <span>{errorMsg}</span>
          </div>
        )}

        <div style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          {(selectedFile || pastedText) && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setSelectedFile(null);
                setPreviewUrl(null);
                setPastedText('');
                setErrorMsg(null);
              }}
              disabled={isLoading}
            >
              {isHindi ? 'साफ़ करें' : 'Clear'}
            </button>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <RefreshCw size={17} className="animate-spin" />
                <span>{isHindi ? 'विश्लेषण जारी है...' : 'Analyzing with Gemma 4...'}</span>
              </>
            ) : (
              <>
                <Sparkles size={17} />
                <span>{isHindi ? 'नोटिस का विश्लेषण करें' : 'Analyze Notice'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </section>
  );
};
