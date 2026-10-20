import React, { useState } from 'react';
import { Cpu, Menu, X, Award, Info } from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import type { SystemConfig, HealthStatus } from '../types';

interface HeaderProps {
  currentLanguage: string;
  onLanguageChange: (lang: string) => void;
  config: SystemConfig | null;
  health: HealthStatus | null;
  onNavigate?: (sectionId: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentLanguage,
  onLanguageChange,
  config,
  health,
  onNavigate,
}) => {
  const isHindi = currentLanguage === 'hi';
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (sectionId: string) => {
    setMobileMenuOpen(false);
    if (onNavigate) {
      onNavigate(sectionId);
    } else {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const isLive = health?.live_inference_available ?? config?.live_inference ?? false;
  const modelName = health?.gemma_model || config?.gemma_model || 'google/gemma-4-31b-it';

  return (
    <header className="header-wrapper" role="banner">
      <div className="header-content">
        {/* Brand Identity */}
        <div className="brand-section">
          <BrandLogo size="md" isHindi={isHindi} />
        </div>

        {/* Desktop Navigation Links */}
        <nav className="desktop-nav" aria-label="Main Navigation">
          <button
            type="button"
            className="nav-link"
            onClick={() => handleNavClick('workspace')}
          >
            {isHindi ? 'कार्यक्षेत्र' : 'Workspace'}
          </button>
          <button
            type="button"
            className="nav-link"
            onClick={() => handleNavClick('demo-notices')}
          >
            {isHindi ? 'डेमो नोटिस' : 'Demo Notices'}
          </button>
          <button
            type="button"
            className="nav-link"
            onClick={() => handleNavClick('how-it-works')}
          >
            {isHindi ? 'कार्यप्रणाली' : 'How It Works'}
          </button>
          <button
            type="button"
            className="nav-link"
            onClick={() => handleNavClick('why-suchnasetu')}
          >
            {isHindi ? 'विशेषताएं' : 'Why SuchnaSetu'}
          </button>
          <button
            type="button"
            className="nav-link"
            onClick={() => handleNavClick('privacy')}
          >
            {isHindi ? 'गोपनीयता' : 'Privacy & AI'}
          </button>
        </nav>

        {/* Right Actions: Model Status, Event Badge, Language Toggle */}
        <div className="header-actions">
          {/* Hackathon Event Pill */}
          <div className="event-pill" title="Hacktoberfest HackDay 2026 — Track 1: Best Use of Gemma 4 (PS 02)">
            <Award size={13} className="event-icon" />
            <span className="event-text">PS 02 • Track 1</span>
          </div>

          {/* Truthful Model Status Indicator */}
          <div
            className={`model-status-chip ${isLive ? 'status-live' : 'status-eval'}`}
            title={
              isLive
                ? `Live Model Connected: ${modelName} (${health?.model_provider || config?.provider || 'API'})`
                : `Evaluation Mode: Deterministic Grounding Adapter active (No live API key set). Enforces 100% PS 02 compliance for evaluation.`
            }
          >
            <span className={`status-dot ${isLive ? 'dot-live' : 'dot-eval'}`} />
            <Cpu size={13} className="model-icon" />
            <span className="model-label">
              {isLive
                ? 'Gemma 4 • Live'
                : (isHindi ? 'जेम्मा 4 • मूल्यांकन मोड' : 'Gemma 4 • Eval Mode')}
            </span>
          </div>

          {/* Bilingual Language Switcher */}
          <div className="lang-switcher" role="group" aria-label="Language selector">
            <button
              type="button"
              className={`lang-switch-btn ${currentLanguage === 'en' ? 'active' : ''}`}
              onClick={() => onLanguageChange('en')}
              aria-pressed={currentLanguage === 'en'}
            >
              EN
            </button>
            <button
              type="button"
              className={`lang-switch-btn ${currentLanguage === 'hi' ? 'active' : ''}`}
              onClick={() => onLanguageChange('hi')}
              aria-pressed={currentLanguage === 'hi'}
            >
              हिंदी
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            type="button"
            className="mobile-menu-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Dropdown */}
      {mobileMenuOpen && (
        <div className="mobile-nav-drawer" role="navigation" aria-label="Mobile Navigation">
          <button
            type="button"
            className="mobile-nav-link"
            onClick={() => handleNavClick('workspace')}
          >
            {isHindi ? 'कार्यक्षेत्र (Workspace)' : 'Workspace'}
          </button>
          <button
            type="button"
            className="mobile-nav-link"
            onClick={() => handleNavClick('demo-notices')}
          >
            {isHindi ? 'डेमो नोटिस (Interactive Samples)' : 'Demo Notices'}
          </button>
          <button
            type="button"
            className="mobile-nav-link"
            onClick={() => handleNavClick('how-it-works')}
          >
            {isHindi ? 'कार्यप्रणाली (How It Works)' : 'How It Works'}
          </button>
          <button
            type="button"
            className="mobile-nav-link"
            onClick={() => handleNavClick('why-suchnasetu')}
          >
            {isHindi ? 'विशेषताएं (Why SuchnaSetu)' : 'Why SuchnaSetu AI'}
          </button>
          <button
            type="button"
            className="mobile-nav-link"
            onClick={() => handleNavClick('privacy')}
          >
            {isHindi ? 'गोपनीयता एवं दायित्व (Privacy & Responsible AI)' : 'Privacy & Responsible AI'}
          </button>
          <div className="mobile-model-info">
            <Info size={14} />
            <span>
              {isLive
                ? `Model: ${modelName} (Live Cloud Provider)`
                : `Engine: Deterministic Evaluation Adapter (Offline)`}
            </span>
          </div>
        </div>
      )}
    </header>
  );
};
