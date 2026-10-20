import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { NoticeInputSection } from './components/NoticeInputSection';
import { ProcessingState } from './components/ProcessingState';
import { SummaryCard } from './components/SummaryCard';
import { StructuredFieldsGrid } from './components/StructuredFieldsGrid';
import { ActionChecklist } from './components/ActionChecklist';
import { FollowUpQA } from './components/FollowUpQA';
import { OriginalNoticeViewer } from './components/OriginalNoticeViewer';
import {
  fetchSystemConfig,
  fetchDemoNotices,
  analyzeNotice,
  confirmField,
} from './services/api';
import type { NoticeAnalysisResult, DemoNotice, SystemConfig } from './types';
import { ArrowLeft, Sparkles, Layers } from 'lucide-react';

export const App: React.FC = () => {
  const [currentLanguage, setCurrentLanguage] = useState<string>('en');
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [demoNotices, setDemoNotices] = useState<DemoNotice[]>([]);
  const [analysisResult, setAnalysisResult] = useState<NoticeAnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isImageSource, setIsImageSource] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const isHindi = currentLanguage === 'hi';

  // Load initial public config and demo notices
  useEffect(() => {
    fetchSystemConfig()
      .then(setConfig)
      .catch((err) => console.warn('Config fetch warning:', err));

    fetchDemoNotices()
      .then(setDemoNotices)
      .catch((err) => console.warn('Demo notices fetch warning:', err));
  }, []);

  const handleAnalyze = async (params: {
    file?: File | null;
    text?: string;
    language: string;
    readingLevel: string;
  }) => {
    setIsLoading(true);
    setError(null);
    setIsImageSource(!!params.file);

    try {
      const result = await analyzeNotice(params);
      setAnalysisResult(result);
      // Smooth scroll down to results
      setTimeout(() => {
        window.scrollTo({ top: 380, behavior: 'smooth' });
      }, 100);
    } catch (err: any) {
      setError(err.message || 'Notice analysis failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLanguageChange = async (newLang: string) => {
    setCurrentLanguage(newLang);
    // If analysis result is already displayed, re-translate using notice text
    if (analysisResult && !isLoading) {
      setIsLoading(true);
      try {
        const reAnalyzed = await analyzeNotice({
          text: analysisResult.ocr_text,
          language: newLang,
          readingLevel: analysisResult.reading_level,
        });
        setAnalysisResult(reAnalyzed);
      } catch (err) {
        console.warn('Re-analysis translation warning:', err);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleConfirmField = async (fieldKey: string, confirmedValue: string) => {
    if (!analysisResult) return;

    await confirmField({
      documentId: analysisResult.document_id,
      fieldKey,
      confirmedValue,
    });

    // Update local state
    setAnalysisResult((prev) => {
      if (!prev) return null;
      const updatedFields = { ...prev.fields };
      if (updatedFields[fieldKey]) {
        updatedFields[fieldKey] = {
          ...updatedFields[fieldKey],
          user_confirmed_value: confirmedValue,
          is_confirmed: true,
          status: 'found',
          uncertainty_reason: undefined,
        };
      }
      return {
        ...prev,
        fields: updatedFields,
        needs_user_confirmation: Object.values(updatedFields).some(
          (f) => f.status === 'needs_confirmation'
        ),
      };
    });
  };

  const handleReset = () => {
    setAnalysisResult(null);
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="app-container">
      <Header
        currentLanguage={currentLanguage}
        onLanguageChange={handleLanguageChange}
        config={config}
      />

      <main className="main-content" role="main">
        {/* Error notification banner */}
        {error && (
          <div
            style={{
              marginBottom: '1.25rem',
              padding: '0.85rem 1rem',
              backgroundColor: 'var(--danger-bg)',
              border: '1px solid var(--danger-border)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--danger-text)',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <strong>{isHindi ? 'त्रुटि:' : 'Error:'}</strong> {error}
          </div>
        )}

        {/* Input Section */}
        <NoticeInputSection
          onAnalyze={handleAnalyze}
          isLoading={isLoading}
          demoNotices={demoNotices}
          currentLanguage={currentLanguage}
          onLanguageChange={handleLanguageChange}
        />

        {/* Processing State */}
        {isLoading && (
          <ProcessingState
            currentLanguage={currentLanguage}
            isImageSource={isImageSource}
          />
        )}

        {/* Results Dashboard */}
        {analysisResult && !isLoading && (
          <div style={{ marginTop: '2rem' }} id="results-dashboard">
            {/* Top Toolbar */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem',
                marginBottom: '1.25rem',
                paddingBottom: '0.75rem',
                borderBottom: '2px solid var(--slate-200)',
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: 'var(--primary-800)',
                    letterSpacing: '0.05em',
                  }}
                >
                  {isHindi ? 'परिणाम डैशबोर्ड' : 'Results Dashboard'}
                </span>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--slate-900)' }}>
                  {isHindi ? 'विश्लेषित सूचना एवं अगले कदम' : 'Accessible Notice Breakdown & Next Steps'}
                </h2>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <span
                  className="badge badge-model"
                  title={analysisResult.is_mock_inference ? 'Evaluation Adapter (Offline)' : 'Live Gemma 4 Inference'}
                >
                  <Sparkles size={13} />
                  <span>{analysisResult.model_used}</span>
                </span>

                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleReset}
                  style={{ padding: '0.45rem 0.85rem', fontSize: '0.82rem' }}
                >
                  <ArrowLeft size={15} />
                  <span>{isHindi ? 'दूसरा नोटिस जांचें' : 'Analyze Another Notice'}</span>
                </button>
              </div>
            </div>

            {/* Summary Card */}
            <SummaryCard result={analysisResult} currentLanguage={currentLanguage} />

            {/* 6 Mandatory Structured Fields Grid */}
            <StructuredFieldsGrid
              fields={analysisResult.fields}
              onConfirmField={handleConfirmField}
              currentLanguage={currentLanguage}
            />

            {/* Action Checklist */}
            <ActionChecklist
              checklist={analysisResult.checklist}
              currentLanguage={currentLanguage}
            />

            {/* Grounded Follow-up Q&A */}
            <FollowUpQA
              documentId={analysisResult.document_id}
              currentLanguage={currentLanguage}
            />

            {/* Original Notice Text & OCR Inspector */}
            <OriginalNoticeViewer
              ocrText={analysisResult.ocr_text}
              confidence={analysisResult.ocr_confidence}
              sourceType={analysisResult.source_type}
              currentLanguage={currentLanguage}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="footer-wrapper" role="contentinfo">
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ textAlign: 'left' }}>
            <p style={{ fontWeight: 700, color: 'var(--slate-700)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Layers size={16} className="text-emerald-700" />
              <span>SuchnaSetu AI (सूचना + सेतु)</span>
            </p>
            <p style={{ fontSize: '0.78rem', color: 'var(--slate-500)', marginTop: '2px' }}>
              “From Complex Notices to Clear Next Steps.” • Official PS 02 Track 1 MVP
            </p>
          </div>

          <div style={{ textAlign: 'right', fontSize: '0.78rem', color: 'var(--slate-500)' }}>
            <p><strong>Hacktoberfest HackDay 2026</strong> • 27 October 2026</p>
            <p>HackDay@Meerut × E-Cell IIMT University • Powered by <strong>Gemma 4</strong></p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
