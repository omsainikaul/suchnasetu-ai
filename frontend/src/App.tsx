import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { HeroSection } from './components/HeroSection';
import { DemoCardsSection } from './components/DemoCardsSection';
import { NoticeInputSection } from './components/NoticeInputSection';
import { ProcessingState } from './components/ProcessingState';
import { ResultsHeader } from './components/ResultsHeader';
import { MainAnalysisLayout } from './components/MainAnalysisLayout';
import { HowItWorksSection } from './components/HowItWorksSection';
import { WhySuchnaSetuSection } from './components/WhySuchnaSetuSection';
import { PrivacySection } from './components/PrivacySection';
import { Footer } from './components/Footer';
import {
  fetchSystemConfig,
  fetchDemoNotices,
  fetchHealth,
  analyzeNotice,
  confirmField,
} from './services/api';
import type {
  NoticeAnalysisResult,
  DemoNotice,
  SystemConfig,
  HealthStatus,
} from './types';
import { AlertCircle } from 'lucide-react';

export const App: React.FC = () => {
  const [currentLanguage, setCurrentLanguage] = useState<string>('en');
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [demoNotices, setDemoNotices] = useState<DemoNotice[]>([]);
  const [analysisResult, setAnalysisResult] = useState<NoticeAnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isImageSource, setIsImageSource] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDemoName, setSelectedDemoName] = useState<string | null>(null);
  const [prefilledText, setPrefilledText] = useState<string>('');

  const isHindi = currentLanguage === 'hi';

  // Load initial public config, health check, and demo notices
  useEffect(() => {
    fetchSystemConfig()
      .then(setConfig)
      .catch((err) => console.warn('Config fetch warning:', err));

    fetchHealth()
      .then(setHealth)
      .catch((err) => console.warn('Health fetch warning:', err));

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
      // Smooth scroll down to results toolbar
      setTimeout(() => {
        const el = document.getElementById('results-dashboard');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
        }
      }, 150);
    } catch (err: any) {
      setError(err.message || (isHindi ? 'नोटिस विश्लेषण में त्रुटि। कृपया पुनः प्रयास करें।' : 'Notice analysis failed. Please try again.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectDemo = (demo: DemoNotice) => {
    setSelectedDemoName(isHindi ? demo.title_hi || demo.title : demo.title);
    setPrefilledText(demo.sample_text);
    // Directly run analysis pipeline with this demo notice
    handleAnalyze({
      text: demo.sample_text,
      language: currentLanguage,
      readingLevel: 'standard',
    });
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

    // Update local state while preserving original extracted value
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
    setSelectedDemoName(null);
    setPrefilledText('');
    const el = document.getElementById('workspace');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const scrollToWorkspace = () => {
    const el = document.getElementById('workspace');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const scrollToDemoNotices = () => {
    const el = document.getElementById('demo-notices');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="app-container">
      {/* 1. Accessible Global Header */}
      <Header
        currentLanguage={currentLanguage}
        onLanguageChange={handleLanguageChange}
        config={config}
        health={health}
      />

      <main className="main-content" role="main">
        {/* Error notification banner */}
        {error && (
          <div className="global-error-banner" role="alert">
            <AlertCircle size={18} className="error-icon" />
            <div className="error-body">
              <strong>{isHindi ? 'त्रुटि:' : 'Error:'}</strong> {error}
            </div>
          </div>
        )}

        {/* 2. Distinctive Civic-Tech Hero Section */}
        <HeroSection
          currentLanguage={currentLanguage}
          onAnalyzeClick={scrollToWorkspace}
          onDemoClick={scrollToDemoNotices}
        />

        {/* 3. Interactive Demonstration Circulars */}
        <DemoCardsSection
          demoNotices={demoNotices}
          currentLanguage={currentLanguage}
          onSelectDemo={handleSelectDemo}
          isLoading={isLoading}
        />

        {/* 4. Streamlined Upload & Paste Workspace */}
        <NoticeInputSection
          onAnalyze={handleAnalyze}
          isLoading={isLoading}
          currentLanguage={currentLanguage}
          onLanguageChange={handleLanguageChange}
          selectedDemoName={selectedDemoName}
          initialText={prefilledText}
        />

        {/* 5. Accessible 5-Step Processing State */}
        {isLoading && (
          <ProcessingState
            currentLanguage={currentLanguage}
            isImageSource={isImageSource}
          />
        )}

        {/* 6. Rich Analysis Results Experience */}
        {analysisResult && !isLoading && (
          <div className="analysis-results-wrapper">
            {/* Results Toolbar Header */}
            <ResultsHeader
              result={analysisResult}
              currentLanguage={currentLanguage}
              onLanguageChange={handleLanguageChange}
              onReset={handleReset}
              onScrollToWorkspace={scrollToWorkspace}
            />

            {/* Main 2-Column Responsive Analysis Layout */}
            <MainAnalysisLayout
              result={analysisResult}
              currentLanguage={currentLanguage}
              onConfirmField={handleConfirmField}
            />
          </div>
        )}

        {/* 7. Supporting Section: How It Works */}
        <HowItWorksSection currentLanguage={currentLanguage} />

        {/* 8. Supporting Section: Why SuchnaSetu AI */}
        <WhySuchnaSetuSection currentLanguage={currentLanguage} />

        {/* 9. Supporting Section: Privacy & Responsible AI */}
        <PrivacySection
          currentLanguage={currentLanguage}
          config={config}
          health={health}
        />
      </main>

      {/* 10. Civic Tech Footer */}
      <Footer currentLanguage={currentLanguage} />
    </div>
  );
};

export default App;
