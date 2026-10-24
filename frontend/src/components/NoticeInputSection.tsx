import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  FileText,
  Image as ImageIcon,
  CheckCircle,
  AlertCircle,
  X,
  Languages,
  BookOpen,
  ArrowRight,
} from 'lucide-react';

interface NoticeInputSectionProps {
  onAnalyze: (params: {
    file?: File | null;
    text?: string;
    language: string;
    readingLevel: string;
  }) => void;
  isLoading: boolean;
  currentLanguage: string;
  onLanguageChange: (lang: string) => void;
  selectedDemoName?: string | null;
  initialText?: string;
}

export const NoticeInputSection: React.FC<NoticeInputSectionProps> = ({
  onAnalyze,
  isLoading,
  currentLanguage,
  onLanguageChange,
  selectedDemoName,
  initialText,
}) => {
  const isHindi = currentLanguage === 'hi';
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pastedText, setPastedText] = useState<string>('');
  const [readingLevel, setReadingLevel] = useState<'standard' | 'simpler'>('standard');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const prevInitialTextRef = useRef<string | undefined>(undefined);

  // Sync initialText if a demo was selected from external section
  useEffect(() => {
    if (initialText && initialText !== prevInitialTextRef.current) {
      prevInitialTextRef.current = initialText;
      setPastedText(initialText);
      setActiveTab('paste');
      setSelectedFile(null);
      setPreviewUrl(null);
    }
  }, [initialText]);

  const handleFileChange = (file: File) => {
    setErrorMsg(null);
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!validTypes.includes(file.type) && !isPdf) {
      setErrorMsg(
        isHindi
          ? 'अमान्य फ़ाइल प्रकार। कृपया PNG, JPEG, WebP छवि या PDF दस्तावेज़ अपलोड करें।'
          : 'Invalid file type. Please upload PNG, JPEG, WebP images or PDF documents.'
      );
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setErrorMsg(
        isHindi
          ? 'फ़ाइल का आकार 15MB से अधिक है।'
          : 'File size exceeds 15MB limit.'
      );
      return;
    }
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (activeTab === 'upload') {
      if (!selectedFile) {
        setErrorMsg(
          isHindi
            ? 'कृपया विश्लेषण हेतु एक नोटिस छवि अपलोड करें।'
            : 'Please select or drop a notice image to analyze.'
        );
        return;
      }
      onAnalyze({
        file: selectedFile,
        language: currentLanguage,
        readingLevel,
      });
    } else {
      if (!pastedText.trim()) {
        setErrorMsg(
          isHindi
            ? 'कृपया विश्लेषण हेतु नोटिस का पाठ पेस्ट करें।'
            : 'Please paste the notice text to analyze.'
        );
        return;
      }
      onAnalyze({
        text: pastedText.trim(),
        language: currentLanguage,
        readingLevel,
      });
    }
  };

  // Determine current input indicator status
  const getInputIndicator = () => {
    if (selectedDemoName) {
      return {
        type: 'demo',
        label: isHindi
          ? `डेमो परिपत्र: ${selectedDemoName}`
          : `Demo Circular: ${selectedDemoName}`,
      };
    }
    if (activeTab === 'upload' && selectedFile) {
      return {
        type: 'image',
        label: `${selectedFile.name} (${(selectedFile.size / 1024).toFixed(1)} KB)`,
      };
    }
    if (activeTab === 'paste' && pastedText.trim()) {
      return {
        type: 'text',
        label: isHindi
          ? `पेस्ट किया गया पाठ (${pastedText.length} वर्ण)`
          : `Pasted Notice Text (${pastedText.length} chars)`,
      };
    }
    return null;
  };

  const inputIndicator = getInputIndicator();

  return (
    <section className="workspace-card" id="workspace" aria-labelledby="workspace-heading">
      {/* Workspace Header */}
      <div className="workspace-header">
        <div>
          <div className="workspace-title-row">
            <h2 id="workspace-heading" className="workspace-title">
              <FileText size={20} className="text-emerald-700" />
              <span>{isHindi ? 'नोटिस विश्लेषण कार्यक्षेत्र' : 'Notice Analysis Workspace'}</span>
            </h2>
            {inputIndicator && (
              <span className={`input-source-pill source-${inputIndicator.type}`}>
                <span className="source-dot" />
                <span className="source-text">{inputIndicator.label}</span>
              </span>
            )}
          </div>
          <p className="workspace-subtitle">
            {isHindi
              ? 'मुद्रित परिपत्र की तस्वीर अपलोड करें या डिजिटल नोटिस का पाठ पेस्ट करें। जेम्मा 4 द्वारा तत्काल विश्लेषण प्राप्त करें।'
              : 'Provide an official notice image for RapidOCR neural extraction or paste circular text directly.'}
          </p>
        </div>
      </div>

      {/* Mode Tabs */}
      <div className="workspace-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          id="tab-upload"
          aria-selected={activeTab === 'upload'}
          aria-controls="panel-upload"
          className={`tab-button ${activeTab === 'upload' ? 'active' : ''}`}
          onClick={() => setActiveTab('upload')}
        >
          <ImageIcon size={18} />
          <span>{isHindi ? 'छवि / PDF दस्तावेज़ अपलोड' : 'Upload Notice Photo / PDF'}</span>
        </button>
        <button
          type="button"
          role="tab"
          id="tab-paste"
          aria-selected={activeTab === 'paste'}
          aria-controls="panel-paste"
          className={`tab-button ${activeTab === 'paste' ? 'active' : ''}`}
          onClick={() => setActiveTab('paste')}
        >
          <FileText size={18} />
          <span>{isHindi ? 'सीधा पाठ पेस्ट करें' : 'Paste Notice Text'}</span>
        </button>
      </div>

      {/* Input Area Form */}
      <form onSubmit={handleSubmit} className="workspace-form">
        {activeTab === 'upload' ? (
          <div id="panel-upload" role="tabpanel" aria-labelledby="tab-upload">
            {!previewUrl ? (
              <div
                className={`dropzone ${dragOver ? 'drag-active' : ''}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                tabIndex={0}
                role="button"
                aria-label="Click or drag file to upload"
                onKeyDown={(e) => {
                  if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,application/pdf,.png,.jpg,.jpeg,.webp,.pdf"
                  style={{ display: 'none' }}
                  onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
                />
                <div className="dropzone-icon-wrap">
                  <Upload size={32} />
                </div>
                <div className="dropzone-text">
                  <p className="dropzone-main">
                    {isHindi
                      ? 'परिपत्र की फ़ोटो यहाँ खींचें या ब्राउज़ करने के लिए क्लिक करें'
                      : 'Drag & drop notice photo or click to browse'}
                  </p>
                  <p className="dropzone-sub">
                    {isHindi
                      ? 'समर्थित प्रारूप: PNG, JPEG, WebP • अधिकतम आकार: 15MB'
                      : 'Supported formats: PNG, JPEG, WebP • Max size: 15MB'}
                  </p>
                </div>
                <div className="dropzone-badges">
                  <span className="format-tag">PNG</span>
                  <span className="format-tag">JPEG</span>
                  <span className="format-tag">WebP</span>
                  <span className="ocr-tag">RapidOCR Enabled</span>
                </div>
              </div>
            ) : (
              <div className="preview-container">
                <div className="preview-image-wrap">
                  <img src={previewUrl} alt="Notice preview" className="preview-img" />
                </div>
                <div className="preview-info">
                  <div className="preview-meta">
                    <span className="preview-badge-status">
                      <CheckCircle size={14} className="text-emerald-600" />
                      <span>{isHindi ? 'छवि तैयार है' : 'Image Ready for OCR'}</span>
                    </span>
                    <h4 className="preview-filename">{selectedFile?.name}</h4>
                    <p className="preview-filesize">
                      {((selectedFile?.size || 0) / 1024).toFixed(1)} KB • {selectedFile?.type}
                    </p>
                  </div>
                  <div className="preview-actions">
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {isHindi ? 'छवि बदलें' : 'Change Image'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm text-red-600"
                      onClick={clearSelectedFile}
                      aria-label="Remove image"
                    >
                      <X size={15} />
                      <span>{isHindi ? 'हटाएं' : 'Remove'}</span>
                    </button>
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  style={{ display: 'none' }}
                  onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
                />
              </div>
            )}
          </div>
        ) : (
          <div id="panel-paste" role="tabpanel" aria-labelledby="tab-paste">
            <div className="textarea-container">
              <label htmlFor="pasted-notice-input" className="sr-only">
                {isHindi ? 'नोटिस का पाठ यहाँ पेस्ट करें' : 'Paste notice text here'}
              </label>
              <textarea
                id="pasted-notice-input"
                className="notice-textarea"
                rows={6}
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder={
                  isHindi
                    ? 'यहाँ सरकारी परिपत्र, छात्रवृत्ति आदेश या विश्वविद्यालय सूचना का पाठ पेस्ट करें...'
                    : 'Paste the full text of an official circular, scholarship notice, or campus order here...'
                }
              />
              <div className="textarea-footer">
                <span className="char-count">
                  {pastedText.length} {isHindi ? 'वर्ण' : 'characters'}
                </span>
                {pastedText && (
                  <button
                    type="button"
                    className="clear-text-btn"
                    onClick={() => setPastedText('')}
                  >
                    {isHindi ? 'साफ़ करें' : 'Clear Text'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Validation Error Message */}
        {errorMsg && (
          <div className="validation-error-banner" role="alert">
            <AlertCircle size={16} className="error-icon" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Configuration Bar & Primary Action */}
        <div className="workspace-controls-bar">
          <div className="selectors-group">
            {/* Language Selector */}
            <div className="control-item">
              <label htmlFor="select-language" className="control-label">
                <Languages size={15} />
                <span>{isHindi ? 'आउटपुट भाषा:' : 'Output Language:'}</span>
              </label>
              <select
                id="select-language"
                value={currentLanguage}
                onChange={(e) => onLanguageChange(e.target.value)}
                className="control-select"
              >
                <option value="en">English</option>
                <option value="hi">हिंदी (Hindi)</option>
              </select>
            </div>

            {/* Reading Level Selector */}
            <div className="control-item">
              <label htmlFor="select-reading-level" className="control-label">
                <BookOpen size={15} />
                <span>{isHindi ? 'पठन स्तर:' : 'Reading Level:'}</span>
              </label>
              <select
                id="select-reading-level"
                value={readingLevel}
                onChange={(e) => setReadingLevel(e.target.value as 'standard' | 'simpler')}
                className="control-select"
              >
                <option value="standard">
                  {isHindi ? 'मानक (Standard)' : 'Standard (Detailed)'}
                </option>
                <option value="simpler">
                  {isHindi ? 'सरल भाषा (Simpler / Easy Read)' : 'Simpler / Easy Read'}
                </option>
              </select>
            </div>
          </div>

          {/* Primary Action Button */}
          <button
            type="submit"
            className="btn btn-primary btn-analyze"
            disabled={isLoading}
            id="btn-analyze-notice"
          >
            {isLoading ? (
              <>
                <span className="spinner" />
                <span>{isHindi ? 'विश्लेषण किया जा रहा है...' : 'Analyzing Notice...'}</span>
              </>
            ) : (
              <>
                <span>{isHindi ? 'नोटिस का विश्लेषण करें' : 'Analyze Notice'}</span>
                <ArrowRight size={17} />
              </>
            )}
          </button>
        </div>
      </form>
    </section>
  );
};
