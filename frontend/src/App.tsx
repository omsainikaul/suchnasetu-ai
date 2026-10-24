import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { HeroSection } from './components/HeroSection';
import { DemoCardsSection } from './components/DemoCardsSection';
import { NoticeInputSection } from './components/NoticeInputSection';
import { ProcessingState } from './components/ProcessingState';
import { ResultsHeader } from './components/ResultsHeader';
import { StructuredFieldsGrid } from './components/StructuredFieldsGrid';
import { OriginalNoticeViewer } from './components/OriginalNoticeViewer';
import { SummaryCard } from './components/SummaryCard';
import { ActionChecklist } from './components/ActionChecklist';
import { CitizenActionSlip } from './components/CitizenActionSlip';
import { RevisionLedgerView } from './components/RevisionLedgerView';
import { EligibilityCheckerView } from './components/EligibilityCheckerView';
import { FollowUpQA } from './components/FollowUpQA';
import { HowItWorksSection } from './components/HowItWorksSection';
import { WhySuchnaSetuSection } from './components/WhySuchnaSetuSection';
import { PrivacySection } from './components/PrivacySection';
import { Footer } from './components/Footer';

// Auth Pages
import { LoginPage } from './components/auth/LoginPage';
import { SignupPage } from './components/auth/SignupPage';
import { VerifyEmailPage } from './components/auth/VerifyEmailPage';
import { ForgotPasswordPage } from './components/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './components/auth/ResetPasswordPage';

// Workspaces
import { DashboardWorkspace } from './components/workspaces/DashboardWorkspace';
import { ActionNavigatorWorkspace } from './components/workspaces/ActionNavigatorWorkspace';
import { MultiNoticeTimelineWorkspace } from './components/workspaces/MultiNoticeTimelineWorkspace';
import { NoticeHistoryWorkspace } from './components/workspaces/NoticeHistoryWorkspace';
import { SettingsHealthWorkspace } from './components/workspaces/SettingsHealthWorkspace';
import { PreflightDiagnosticsWorkspace } from './components/workspaces/PreflightDiagnosticsWorkspace';

import {
  fetchSystemConfig,
  fetchDemoNotices,
  fetchHealth,
  analyzeNotice,
  confirmField,
  fetchDocumentSession,
  fetchAuthMe,
  logoutAccount,
} from './services/api';
import {
  applyStoredStateToAnalysis,
  saveDocumentState,
  getNoticeHistory,
  saveNoticeToHistory,
} from './services/storage';
import type {
  NoticeAnalysisResult,
  DemoNotice,
  SystemConfig,
  HealthStatus,
  WorkspaceId,
  UserProfile,
  AuthPageView,
} from './types';
import {
  AlertCircle,
  FileText,
  Search,
  ListOrdered,
  X,
  Sparkles,
  Upload,
} from 'lucide-react';

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

  // Authentication State
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [authView, setAuthView] = useState<AuthPageView | null>(() => {
    const p = window.location.pathname;
    if (p === '/signup') return 'signup';
    if (p === '/verify-email') return 'verify_email';
    if (p === '/forgot-password') return 'forgot_password';
    if (p === '/reset-password') return 'reset_password';
    if (p === '/login') return 'login';
    return null;
  });
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);
  const [isGuestMode, setIsGuestMode] = useState<boolean>(false);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string>(() => {
    try {
      const urlEmail = new URLSearchParams(window.location.search).get('email');
      if (urlEmail) return urlEmail;
      return sessionStorage.getItem('suchnasetu_pending_verification_email') || '';
    } catch {
      return '';
    }
  });

  // Dashboard & Navigation State
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceId>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [isOriginalNoticeModalOpen, setIsOriginalNoticeModalOpen] = useState<boolean>(false);
  const [historyCount, setHistoryCount] = useState<number>(0);
  const [highlightedSnippet, setHighlightedSnippet] = useState<string | null>(null);

  const isHindi = currentLanguage === 'hi';

  const reloadHealth = () => {
    fetchHealth()
      .then(setHealth)
      .catch((err) => console.warn('Health fetch warning:', err));
  };

  // 1. Initial auth verification via GET /api/auth/me
  useEffect(() => {
    fetchAuthMe()
      .then((user) => {
        if (!user) {
          setCurrentUser(null);
          setHistoryCount(getNoticeHistory().length);
          const p = window.location.pathname;
          setAuthView((prev) => (p === '/' && !prev ? 'login' : prev));
          return;
        }
        setCurrentUser(user);
        setHistoryCount(getNoticeHistory(user.id).length);
        const p = window.location.pathname;
        if (p === '/login' || p === '/signup') {
          setAuthView(null);
          window.history.replaceState(null, '', '/');
        }
      })
      .catch(() => {
        setCurrentUser(null);
        setHistoryCount(getNoticeHistory().length);
        const p = window.location.pathname;
        setAuthView((prev) => (p === '/' && !prev ? 'login' : prev));
      })
      .finally(() => {
        setIsAuthChecking(false);
      });
  }, []);

  // 2. Browser history popstate navigation
  useEffect(() => {
    const handlePopState = () => {
      const p = window.location.pathname;
      if (p === '/signup') setAuthView('signup');
      else if (p === '/verify-email') setAuthView('verify_email');
      else if (p === '/forgot-password') setAuthView('forgot_password');
      else if (p === '/reset-password') setAuthView('reset_password');
      else if (p === '/login') setAuthView('login');
      else if (p === '/') {
        if (currentUser) setAuthView(null);
        else if (!isGuestMode) setAuthView('login');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentUser, isGuestMode]);

  // 3. Load initial public config, health check, demo notices, and document session
  useEffect(() => {
    fetchSystemConfig()
      .then(setConfig)
      .catch((err) => console.warn('Config fetch warning:', err));

    reloadHealth();

    fetchDemoNotices()
      .then(setDemoNotices)
      .catch((err) => console.warn('Demo notices fetch warning:', err));

    // Restore active document session on reload if still valid
    try {
      const lastDocId = sessionStorage.getItem('suchnasetu_last_doc_id');
      if (lastDocId) {
        fetchDocumentSession(lastDocId)
          .then((docResult) => {
            const restored = applyStoredStateToAnalysis(docResult);
            setAnalysisResult(restored);
          })
          .catch(() => {
            try {
              sessionStorage.removeItem('suchnasetu_last_doc_id');
            } catch {}
          });
      }
    } catch {}
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
      const rawResult = await analyzeNotice(params);
      // Merge with any persisted user progress or confirmations
      const result = applyStoredStateToAnalysis(rawResult);
      setAnalysisResult(result);
      saveNoticeToHistory(result, currentUser?.id);
      setHistoryCount(getNoticeHistory(currentUser?.id).length);

      try {
        sessionStorage.setItem('suchnasetu_last_doc_id', result.document_id);
      } catch {}

      // Transition to dashboard or grounded facts view to display results
      setActiveWorkspace('dashboard');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setError(
        err.message ||
          (isHindi
            ? 'नोटिस विश्लेषण में त्रुटि। कृपया पुनः प्रयास करें।'
            : 'Notice analysis failed. Please try again.')
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectDemo = (demo: DemoNotice) => {
    setSelectedDemoName(isHindi ? demo.title_hi || demo.title : demo.title);
    setPrefilledText(demo.sample_text);
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
        const restored = applyStoredStateToAnalysis(reAnalyzed);
        setAnalysisResult(restored);
        saveNoticeToHistory(restored, currentUser?.id);
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

    const origVal = analysisResult.fields[fieldKey]?.value || '';

    saveDocumentState(analysisResult.document_id, {
      fieldConfirmations: {
        [fieldKey]: {
          fieldKey,
          originalValue: origVal,
          confirmedValue,
          confirmedAt: new Date().toISOString(),
        },
      },
    });

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
      const updatedResult = {
        ...prev,
        fields: updatedFields,
        needs_user_confirmation: Object.values(updatedFields).some(
          (f) => f.status === 'needs_confirmation'
        ),
      };
      saveNoticeToHistory(updatedResult, currentUser?.id);
      return updatedResult;
    });
  };

  const handleReset = () => {
    setAnalysisResult(null);
    setError(null);
    setSelectedDemoName(null);
    setPrefilledText('');
    try {
      sessionStorage.removeItem('suchnasetu_last_doc_id');
    } catch {}
    setActiveWorkspace('dashboard');
  };

  const handleOpenHistoryNotice = async (docId: string) => {
    try {
      setIsLoading(true);
      const docResult = await fetchDocumentSession(docId);
      const restored = applyStoredStateToAnalysis(docResult);
      setAnalysisResult(restored);
      setActiveWorkspace('dashboard');
    } catch {
      // If server session expired, search history rawText
      const history = getNoticeHistory(currentUser?.id);
      const item = history.find((h) => h.documentId === docId);
      if (item && item.rawText) {
        handleAnalyze({
          text: item.rawText,
          language: currentLanguage,
          readingLevel: 'standard',
        });
      } else {
        setError(
          isHindi
            ? 'सत्र समाप्त हो गया है। कृपया नोटिस पुनः लोड करें।'
            : 'Session expired for this notice. Please re-analyze the document.'
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToAuth = (view: AuthPageView | null, state?: { email?: string }) => {
    setAuthView(view);
    if (state?.email) {
      setPendingVerificationEmail(state.email);
      try {
        sessionStorage.setItem('suchnasetu_pending_verification_email', state.email);
      } catch {}
    }
    let path = '/';
    if (view === 'login') path = '/login';
    else if (view === 'signup') path = '/signup';
    else if (view === 'verify_email') {
      const emailToUse = state?.email || pendingVerificationEmail || '';
      path = emailToUse ? `/verify-email?email=${encodeURIComponent(emailToUse)}` : '/verify-email';
    }
    else if (view === 'forgot_password') path = '/forgot-password';
    else if (view === 'reset_password') path = '/reset-password';

    if (window.location.pathname + window.location.search !== path) {
      window.history.pushState(state || null, '', path);
    }
  };

  const handleLoginSuccess = (user: UserProfile) => {
    setCurrentUser(user);
    setAuthView(null);
    setIsGuestMode(false);
    setHistoryCount(getNoticeHistory(user.id).length);
    if (window.location.pathname.startsWith('/login') || window.location.pathname.startsWith('/signup')) {
      window.history.pushState(null, '', '/');
    }
  };

  const handleLogout = async () => {
    try {
      await logoutAccount();
    } catch (err) {
      console.warn('Logout warning:', err);
    }
    setCurrentUser(null);
    setAnalysisResult(null);
    setPrefilledText('');
    setSelectedDemoName(null);
    setError(null);
    try {
      sessionStorage.removeItem('suchnasetu_last_doc_id');
    } catch {}
    setActiveWorkspace('dashboard');
    setIsGuestMode(false);
    setAuthView('login');
    if (window.location.pathname !== '/login') {
      window.history.pushState(null, '', '/login');
    }
  };

  if (isAuthChecking) {
    return (
      <div className="auth-shell">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem' }}>
          <div className="auth-loading-spinner" style={{ width: '2.5rem', height: '2.5rem', border: '3px solid #e2e8f0', borderTopColor: '#059669', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <p style={{ color: '#64748b', fontSize: '0.95rem' }}>
            {isHindi ? 'सत्र की पुष्टि की जा रही है...' : 'Verifying secure session...'}
          </p>
        </div>
      </div>
    );
  }

  if (!currentUser && !isGuestMode && authView) {
    if (authView === 'login') {
      return (
        <LoginPage
          currentLanguage={currentLanguage}
          onLanguageChange={handleLanguageChange}
          onLoginSuccess={handleLoginSuccess}
          onNavigateAuth={navigateToAuth}
          onContinueAsGuest={() => {
            setIsGuestMode(true);
            setAuthView(null);
            if (window.location.pathname !== '/') {
              window.history.pushState(null, '', '/');
            }
          }}
        />
      );
    }
    if (authView === 'signup') {
      return (
        <SignupPage
          currentLanguage={currentLanguage}
          onLanguageChange={handleLanguageChange}
          onNavigateAuth={navigateToAuth}
        />
      );
    }
    if (authView === 'verify_email') {
      return (
        <VerifyEmailPage
          initialEmail={pendingVerificationEmail}
          currentLanguage={currentLanguage}
          onLanguageChange={handleLanguageChange}
          onVerificationSuccess={() => {
            try {
              sessionStorage.removeItem('suchnasetu_pending_verification_email');
            } catch {}
            setPendingVerificationEmail('');
            navigateToAuth('login');
          }}
          onNavigateLogin={() => navigateToAuth('login')}
          onNavigateSignup={() => navigateToAuth('signup')}
        />
      );
    }
    if (authView === 'forgot_password') {
      return (
        <ForgotPasswordPage
          currentLanguage={currentLanguage}
          onLanguageChange={handleLanguageChange}
          onNavigateAuth={navigateToAuth}
        />
      );
    }
    if (authView === 'reset_password') {
      return (
        <ResetPasswordPage
          currentLanguage={currentLanguage}
          onLanguageChange={handleLanguageChange}
          onResetSuccess={() => {
            navigateToAuth('login');
          }}
          onNavigateLogin={() => navigateToAuth('login')}
        />
      );
    }
  }

  return (
    <div className="app-shell">
      {/* 1. Global Navigation Header */}
      <Header
        currentLanguage={currentLanguage}
        onLanguageChange={handleLanguageChange}
        config={config}
        health={health}
        activeResult={analysisResult}
        onOpenOriginalNotice={() => setIsOriginalNoticeModalOpen(true)}
        onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        onProviderChanged={reloadHealth}
        currentUser={currentUser}
        onLogout={handleLogout}
        onNavigateAuth={(view) => {
          setIsGuestMode(false);
          navigateToAuth(view);
        }}
      />

      <div className="app-shell-body">
        {/* 2. Left Persistent & Responsive Sidebar */}
        <Sidebar
          activeWorkspace={activeWorkspace}
          onSelectWorkspace={setActiveWorkspace}
          demoNotices={demoNotices}
          onSelectDemo={handleSelectDemo}
          onResetWorkspace={handleReset}
          hasLoadedNotice={!!analysisResult}
          historyCount={historyCount}
          currentLanguage={currentLanguage}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        {/* 3. Main Workspace Content View */}
        <main className="app-workspace-content" role="main">
          {/* Error notification banner */}
          {error && (
            <div className="global-error-banner" role="alert" style={{ marginBottom: '1.5rem' }}>
              <AlertCircle size={18} className="error-icon" />
              <div className="error-body">
                <strong>{isHindi ? 'त्रुटि:' : 'Error:'}</strong> {error}
              </div>
              <button
                type="button"
                onClick={() => setError(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: 'auto' }}
                aria-label="Dismiss Error"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* WORKSPACE 1: DASHBOARD */}
          {activeWorkspace === 'dashboard' && (
            <DashboardWorkspace
              currentLanguage={currentLanguage}
              result={analysisResult}
              onNavigateWorkspace={setActiveWorkspace}
              onLoadQuickDemo={() => {
                if (demoNotices.length > 0) handleSelectDemo(demoNotices[0]);
              }}
              onScrollToInput={() => setActiveWorkspace('ingestion')}
            />
          )}

          {/* WORKSPACE 2: INGESTION & OCR */}
          {activeWorkspace === 'ingestion' && (
            <div className="workspace-view">
              <div className="workspace-header">
                <div className="workspace-title-row">
                  <div className="workspace-title-left">
                    <h2 className="workspace-title">
                      {isHindi ? 'अंतर्ग्रहण और ओसीआर कार्यक्षेत्र' : 'Notice Ingestion & OCR'}
                    </h2>
                    <span className="workspace-badge-pill">
                      {analysisResult ? 'Active Document Loaded' : 'Ready for Ingestion'}
                    </span>
                  </div>
                </div>
                <p className="workspace-subtitle">
                  {isHindi
                    ? 'आधिकारिक परिपत्र, स्कैन की गई छवि, या पीडीएफ अपलोड करें। रैपिडओसीआर और टेसेरैक्ट समर्थन के साथ।'
                    : 'Upload official circular, scanned photo, or multi-page PDF with RapidOCR & Tesseract fallback.'}
                </p>
              </div>

              {/* Notice Input Section */}
              <NoticeInputSection
                onAnalyze={handleAnalyze}
                isLoading={isLoading}
                currentLanguage={currentLanguage}
                onLanguageChange={handleLanguageChange}
                selectedDemoName={selectedDemoName}
                initialText={prefilledText}
              />

              {isLoading && (
                <ProcessingState
                  currentLanguage={currentLanguage}
                  isImageSource={isImageSource}
                />
              )}
            </div>
          )}

          {/* WORKSPACE 3: GROUNDED FACTS */}
          {activeWorkspace === 'facts' && (
            <div className="workspace-view">
              <div className="workspace-header">
                <div className="workspace-title-row">
                  <div className="workspace-title-left">
                    <h2 className="workspace-title">
                      {isHindi ? 'साक्ष्य-आधारित तथ्य (PS 02 श्रेणियां)' : 'Grounded Facts (PS 02 Categories)'}
                    </h2>
                    <span className="workspace-badge-pill">
                      {analysisResult ? '6/6 Verified Extraction' : 'Awaiting Document'}
                    </span>
                  </div>
                </div>
                <p className="workspace-subtitle">
                  {isHindi
                    ? 'मूल परिपत्र से उद्धृत 6 आधिकारिक श्रेणियां। प्रत्येक तथ्य सटीक साक्ष्य से जुड़ा है।'
                    : 'Six verified circular dimensions strictly anchored to extracted text quotations.'}
                </p>
              </div>

              {analysisResult ? (
                <div>
                  <ResultsHeader
                    result={analysisResult}
                    currentLanguage={currentLanguage}
                    onLanguageChange={handleLanguageChange}
                    onReset={handleReset}
                    onScrollToWorkspace={() => setActiveWorkspace('ingestion')}
                  />
                  <div className="analysis-two-column-layout" style={{ marginTop: '1.25rem' }}>
                    <aside className="analysis-left-panel" aria-label="Original Notice Source Panel">
                      <OriginalNoticeViewer
                        ocrText={analysisResult.ocr_text}
                        confidence={analysisResult.ocr_confidence}
                        sourceType={analysisResult.source_type}
                        currentLanguage={currentLanguage}
                        highlightSnippet={highlightedSnippet}
                        onClearHighlight={() => setHighlightedSnippet(null)}
                      />
                    </aside>
                    <div className="analysis-right-panel" aria-label="Structured Facts Grid">
                      <StructuredFieldsGrid
                        fields={analysisResult.fields}
                        onConfirmField={handleConfirmField}
                        currentLanguage={currentLanguage}
                        onHighlightEvidence={(snippet) => setHighlightedSnippet(snippet)}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="workspace-empty-state">
                  <div className="workspace-empty-icon">
                    <Search size={28} />
                  </div>
                  <h3 className="workspace-empty-title">
                    {isHindi ? 'कोई नोटिस लोड नहीं है' : 'No Notice Currently Analyzed'}
                  </h3>
                  <p className="workspace-empty-text">
                    {isHindi
                      ? 'साक्ष्य-आधारित तथ्यों को देखने के लिए पहले एक परिपत्र अपलोड करें या डेमो लोड करें।'
                      : 'Please analyze an official notice or explore a demo circular to view verified grounded facts.'}
                  </p>
                  <div className="workspace-empty-actions">
                    <button
                      type="button"
                      className="hero-primary-btn"
                      onClick={() => setActiveWorkspace('ingestion')}
                    >
                      <Upload size={16} />
                      <span>{isHindi ? 'नोटिस अपलोड करें' : 'Upload Notice'}</span>
                    </button>
                    <button
                      type="button"
                      className="hero-secondary-btn"
                      onClick={() => {
                        if (demoNotices.length > 0) handleSelectDemo(demoNotices[0]);
                      }}
                    >
                      <Sparkles size={16} />
                      <span>{isHindi ? 'डेमो लोड करें' : 'Load Demo'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* WORKSPACE 4: SUMMARY & ACTIONS */}
          {activeWorkspace === 'summary_actions' && (
            <div className="workspace-view">
              <div className="workspace-header">
                <div className="workspace-title-row">
                  <div className="workspace-title-left">
                    <h2 className="workspace-title">
                      {isHindi ? 'सरल सारांश और नागरिक कार्य योजना' : 'Summary & Citizen Action Roadmap'}
                    </h2>
                    <span className="workspace-badge-pill">
                      {analysisResult ? 'Plain-Language & Audio Ready' : 'Awaiting Document'}
                    </span>
                  </div>
                </div>
                <p className="workspace-subtitle">
                  {isHindi
                    ? 'कानूनी शब्दावली से मुक्त स्पष्ट सारांश और समयबद्ध नागरिक चेकलिस्ट।'
                    : 'Accessible plain-language translation, step-by-step citizen checklist, and high-contrast printable action slip.'}
                </p>
              </div>

              {analysisResult ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <SummaryCard result={analysisResult} currentLanguage={currentLanguage} />
                  <ActionChecklist
                    checklist={analysisResult.checklist}
                    currentLanguage={currentLanguage}
                    documentId={analysisResult.document_id}
                    onHighlightEvidence={(snippet) => setHighlightedSnippet(snippet)}
                  />
                  <CitizenActionSlip result={analysisResult} currentLanguage={currentLanguage} />
                </div>
              ) : (
                <div className="workspace-empty-state">
                  <div className="workspace-empty-icon">
                    <ListOrdered size={28} />
                  </div>
                  <h3 className="workspace-empty-title">
                    {isHindi ? 'कोई सक्रिय कार्य योजना नहीं' : 'No Active Action Checklist'}
                  </h3>
                  <p className="workspace-empty-text">
                    {isHindi
                      ? 'चरण-दर-चरण नागरिक चेकलिस्ट और सारांश देखने के लिए एक परिपत्र का विश्लेषण करें।'
                      : 'Upload a circular or select a demo notice to generate an actionable checklist and printable slip.'}
                  </p>
                  <div className="workspace-empty-actions">
                    <button
                      type="button"
                      className="hero-primary-btn"
                      onClick={() => setActiveWorkspace('ingestion')}
                    >
                      <Upload size={16} />
                      <span>{isHindi ? 'नोटिस अपलोड करें' : 'Upload Notice'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* WORKSPACE 5: REVISION LEDGER */}
          {activeWorkspace === 'revision_ledger' && (
            <div className="workspace-view">
              <RevisionLedgerView
                currentNoticeText={analysisResult?.ocr_text || ''}
                currentNoticeTitle={analysisResult?.notice_title || 'Base Scholarship Notice (2026)'}
                currentLanguage={currentLanguage}
              />
            </div>
          )}

          {/* WORKSPACE 6: ELIGIBILITY CHECK */}
          {activeWorkspace === 'eligibility' && (
            <div className="workspace-view">
              <EligibilityCheckerView
                noticeText={analysisResult?.ocr_text || ''}
                documentId={analysisResult?.document_id}
                currentLanguage={currentLanguage}
              />
            </div>
          )}

          {/* WORKSPACE 7: FOLLOW-UP Q&A */}
          {activeWorkspace === 'qa' && (
            <div className="workspace-view">
              <div className="workspace-header">
                <div className="workspace-title-row">
                  <div className="workspace-title-left">
                    <h2 className="workspace-title">
                      {isHindi ? 'अनुवर्ती प्रश्नोत्तर (साक्ष्य-आधारित)' : 'Follow-Up Notice Q&A'}
                    </h2>
                    <span className="workspace-badge-pill">Strict Non-Hallucination</span>
                  </div>
                </div>
                <p className="workspace-subtitle">
                  {isHindi
                    ? 'वर्तमान परिपत्र के बारे में प्रश्न पूछें। यदि जानकारी परिपत्र में नहीं है, तो इंजन स्पष्ट रूप से अस्वीकार करेगा।'
                    : 'Ask specific questions grounded strictly in the loaded circular. Flags unstated criteria honestly.'}
                </p>
              </div>

              {analysisResult ? (
                <FollowUpQA
                  documentId={analysisResult.document_id}
                  currentLanguage={currentLanguage}
                  onHighlightEvidence={(snippet) => setHighlightedSnippet(snippet)}
                />
              ) : (
                <div className="workspace-empty-state">
                  <div className="workspace-empty-icon">
                    <FileText size={28} />
                  </div>
                  <h3 className="workspace-empty-title">
                    {isHindi ? 'कोई परिपत्र सक्रिय नहीं है' : 'Notice Context Required'}
                  </h3>
                  <p className="workspace-empty-text">
                    {isHindi
                      ? 'अनुवर्ती प्रश्न पूछने के लिए पहले एक परिपत्र लोड करें ताकि उत्तर केवल उसके साक्ष्य पर आधारित हों।'
                      : 'Please load a notice first so answers are grounded strictly in its authentic text.'}
                  </p>
                  <div className="workspace-empty-actions">
                    <button
                      type="button"
                      className="hero-primary-btn"
                      onClick={() => {
                        if (demoNotices.length > 0) handleSelectDemo(demoNotices[0]);
                      }}
                    >
                      <Sparkles size={16} />
                      <span>{isHindi ? 'डेमो लोड करें' : 'Load Demo Notice'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* WORKSPACE 8: ACTION NAVIGATOR */}
          {activeWorkspace === 'action_navigator' && (
            <div className="workspace-view">
              <ActionNavigatorWorkspace
                currentLanguage={currentLanguage}
                result={analysisResult}
                onNavigateWorkspace={setActiveWorkspace}
                onHighlightEvidence={(snippet) => setHighlightedSnippet(snippet)}
              />
            </div>
          )}

          {/* WORKSPACE 9: MULTI-NOTICE TIMELINE */}
          {activeWorkspace === 'multi_notice_timeline' && (
            <div className="workspace-view">
              <MultiNoticeTimelineWorkspace
                currentLanguage={currentLanguage}
                result={analysisResult}
                onNavigateWorkspace={setActiveWorkspace}
              />
            </div>
          )}

          {/* WORKSPACE 10: NOTICE HISTORY */}
          {activeWorkspace === 'history' && (
            <div className="workspace-view">
              <NoticeHistoryWorkspace
                key={currentUser?.id || 'anon'}
                currentLanguage={currentLanguage}
                onReopenNotice={handleOpenHistoryNotice}
                onNavigateWorkspace={setActiveWorkspace}
                userId={currentUser?.id}
                onHistoryCountChange={setHistoryCount}
              />
            </div>
          )}

          {/* WORKSPACE 11: SETTINGS & HEALTH */}
          {activeWorkspace === 'settings_health' && (
            <div className="workspace-view">
              <SettingsHealthWorkspace
                currentLanguage={currentLanguage}
                config={config}
                health={health}
                onRefreshHealth={reloadHealth}
                onProviderChanged={reloadHealth}
              />
            </div>
          )}

          {/* WORKSPACE 12: DEMO NOTICES */}
          {activeWorkspace === 'demo_notices' && (
            <div className="workspace-view">
              <div className="workspace-header">
                <div className="workspace-title-row">
                  <div className="workspace-title-left">
                    <h2 className="workspace-title">
                      {isHindi ? 'डेमो परिपत्र पुस्तकालय' : 'Synthetic Demonstration Notice Library'}
                    </h2>
                    <span className="workspace-badge-pill">PS02 Benchmarks</span>
                  </div>
                </div>
                <p className="workspace-subtitle">
                  {isHindi
                    ? 'विभिन्न प्रकार के परिपत्रों (छात्रवृत्ति, परीक्षा, शुद्धिपत्र, द्वैभाषी) पर सिस्टम का परीक्षण करें।'
                    : 'Explore vetted benchmark circulars covering scholarships, UPSC corrigenda, and multi-lingual notices.'}
                </p>
              </div>

              <DemoCardsSection
                demoNotices={demoNotices}
                currentLanguage={currentLanguage}
                onSelectDemo={handleSelectDemo}
                isLoading={isLoading}
              />
            </div>
          )}

          {/* WORKSPACE 13: PREFLIGHT DIAGNOSTICS */}
          {activeWorkspace === 'diagnostics' && (
            <div className="workspace-view">
              <PreflightDiagnosticsWorkspace
                currentLanguage={currentLanguage}
                config={config}
                health={health}
              />
            </div>
          )}

          {/* SECONDARY LANDING PAGE (HOME) */}
          {activeWorkspace === 'home' && (
            <div className="home-landing-page">
              <HeroSection
                currentLanguage={currentLanguage}
                onAnalyzeClick={() => setActiveWorkspace('ingestion')}
                onDemoClick={() => setActiveWorkspace('demo_notices')}
              />
              <DemoCardsSection
                demoNotices={demoNotices}
                currentLanguage={currentLanguage}
                onSelectDemo={handleSelectDemo}
                isLoading={isLoading}
              />
              <HowItWorksSection currentLanguage={currentLanguage} />
              <WhySuchnaSetuSection currentLanguage={currentLanguage} />
              <PrivacySection
                currentLanguage={currentLanguage}
                config={config}
                health={health}
              />
              <Footer currentLanguage={currentLanguage} />
            </div>
          )}
        </main>
      </div>

      {/* Original Notice Modal View */}
      {isOriginalNoticeModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsOriginalNoticeModalOpen(false)}>
          <div
            className="original-notice-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Original Notice Source Viewer"
          >
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <FileText size={18} color="#047857" />
                <h3 className="modal-title">
                  {isHindi ? 'मूल परिपत्र साक्ष्य दर्शक' : 'Original Notice Ground-Truth Buffer'}
                </h3>
              </div>
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => setIsOriginalNoticeModalOpen(false)}
                aria-label="Close Modal"
              >
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              {analysisResult ? (
                <OriginalNoticeViewer
                  ocrText={analysisResult.ocr_text}
                  confidence={analysisResult.ocr_confidence}
                  sourceType={analysisResult.source_type}
                  currentLanguage={currentLanguage}
                  highlightSnippet={highlightedSnippet}
                  onClearHighlight={() => setHighlightedSnippet(null)}
                />
              ) : (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                  {isHindi
                    ? 'कोई परिपत्र लोड नहीं है। कृपया पहले एक परिपत्र का विश्लेषण करें।'
                    : 'No notice currently loaded in workspace.'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
