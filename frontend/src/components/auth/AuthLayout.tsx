import React from 'react';
import { BrandLogo } from '../BrandLogo';
import { ShieldCheck } from 'lucide-react';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
  currentLanguage: string;
  onLanguageChange: (lang: string) => void;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({
  children,
  title,
  subtitle,
  currentLanguage,
  onLanguageChange,
}) => {
  const isHindi = currentLanguage === 'hi';

  return (
    <div className="auth-shell">
      {/* Top Header */}
      <header className="auth-header">
        <div className="auth-header-container">
          <BrandLogo size="md" isHindi={isHindi} />

          <div className="auth-header-actions">
            <div className="toolbar-lang-toggle" role="group" aria-label="Language selection">
              <button
                type="button"
                className={`lang-pill ${currentLanguage === 'en' ? 'active' : ''}`}
                onClick={() => onLanguageChange('en')}
                aria-pressed={currentLanguage === 'en'}
              >
                English
              </button>
              <button
                type="button"
                className={`lang-pill ${currentLanguage === 'hi' ? 'active' : ''}`}
                onClick={() => onLanguageChange('hi')}
                aria-pressed={currentLanguage === 'hi'}
              >
                हिंदी
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="auth-main-content">
        <div className="auth-card-wrapper">
          <div className="auth-card-top-accent" />

          <div className="auth-card-header">
            <div className="auth-badge-kicker">
              <ShieldCheck size={14} className="text-emerald-600" />
              <span>{isHindi ? 'सुरक्षित नागरिक पहुंच' : 'SECURE CITIZEN ACCESS'}</span>
            </div>
            <h1 className="auth-card-title">{title}</h1>
            <p className="auth-card-subtitle">{subtitle}</p>
          </div>

          <div className="auth-card-body">
            {children}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="auth-footer">
        <div className="auth-footer-container">
          <span>SuchnaSetu AI &bull; सूचना + सेतु</span>
          <span>PS 02 Notice-to-Action Accessibility Assistant &bull; Gemma 4 Integration</span>
        </div>
      </footer>
    </div>
  );
};
