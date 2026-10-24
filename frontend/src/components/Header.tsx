import React, { useState, useEffect, useRef } from 'react';
import { Menu, Eye, Globe2, ShieldCheck, Server, User, LogOut, ChevronDown } from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import type { SystemConfig, HealthStatus, NoticeAnalysisResult, ProviderInfo, UserProfile, AuthPageView } from '../types';
import { fetchProviders, selectProvider } from '../services/api';

interface HeaderProps {
  currentLanguage: string;
  onLanguageChange: (lang: string) => void;
  config?: SystemConfig | null;
  health: HealthStatus | null;
  activeResult?: NoticeAnalysisResult | null;
  onOpenOriginalNotice?: () => void;
  onToggleMobileSidebar?: () => void;
  onProviderChanged?: (providerId: string) => void;
  currentUser?: UserProfile | null;
  onLogout?: () => void;
  onNavigateAuth?: (view: AuthPageView) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentLanguage,
  onLanguageChange,
  health,
  activeResult,
  onOpenOriginalNotice,
  onToggleMobileSidebar,
  onProviderChanged,
  currentUser,
  onLogout,
  onNavigateAuth,
}) => {
  const isHindi = currentLanguage === 'hi';
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>('openrouter');
  const [isSwitchingProvider, setIsSwitchingProvider] = useState<boolean>(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState<boolean>(false);
  const userDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setIsUserDropdownOpen(false);
      }
    };
    if (isUserDropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isUserDropdownOpen]);

  useEffect(() => {
    fetchProviders()
      .then((data) => {
        setProviders(data);
        const current = data.find((p) => p.is_current);
        if (current) {
          setSelectedProvider(current.id);
        } else if (health?.model_provider) {
          setSelectedProvider(health.model_provider);
        }
      })
      .catch(() => {
        // Fallback default provider list
        setProviders([
          { id: 'openrouter', name: 'OpenRouter (Gemma 4 Cloud)', available: true, model: 'google/gemma-4-31b-it', is_current: true },
          { id: 'ollama', name: 'Local Ollama (100% Private)', available: true, model: 'gemma4:latest', is_current: false },
          { id: 'mock', name: 'Deterministic Mock (Offline)', available: true, model: 'deterministic-mock', is_current: false },
        ]);
      });
  }, [health]);

  const handleProviderSelect = async (providerId: string) => {
    setSelectedProvider(providerId);
    setIsSwitchingProvider(true);
    try {
      await selectProvider(providerId);
      if (onProviderChanged) onProviderChanged(providerId);
    } catch (err) {
      console.warn('Provider switch error:', err);
    } finally {
      setIsSwitchingProvider(false);
    }
  };

  const getProviderPill = () => {
    const activeProvider = providers.find((p) => p.id === selectedProvider);
    const modelName = activeProvider?.model || (selectedProvider === 'openrouter' ? 'google/gemma-4-31b-it' : selectedProvider);

    if (selectedProvider === 'ollama') {
      return {
        label: isHindi ? 'लोकल ओलामा (100% निजी)' : `Local Ollama (${modelName})`,
        icon: ShieldCheck,
        className: 'provider-pill-local',
        title: `Local Ollama (${modelName}): Inference runs entirely on your local machine with zero external network transmission.`,
      };
    }
    if (selectedProvider === 'mock') {
      return {
        label: isHindi ? 'ऑफ़लाइन मूल्यांकन इंजन' : 'Deterministic Grounding (Offline)',
        icon: Server,
        className: 'provider-pill-mock',
        title: 'Deterministic Engine: Rule-based extraction running offline without external API dependencies.',
      };
    }
    if (selectedProvider === 'gemini') {
      return {
        label: isHindi ? 'गूगल जेमिनी 2.5 फ्लैश (क्लाउड)' : `Gemini 2.5 Flash (Cloud API)`,
        icon: Globe2,
        className: 'provider-pill-cloud',
        title: `Google Gemini (${modelName}): Cloud inference via Google Gemini API over secure HTTPS.`,
      };
    }
    return {
      label: isHindi ? 'जेम्मा 4 • ओपन-राउटर (क्लाउड)' : `Gemma 4 • OpenRouter (${modelName})`,
      icon: Globe2,
      className: 'provider-pill-cloud',
      title: `Cloud Inference: ${modelName} via OpenRouter API over secure HTTPS (not a local model).`,
    };
  };

  const providerPill = getProviderPill();
  const ProviderIcon = providerPill.icon;

  return (
    <header className="header-wrapper" role="banner">
      <div className="header-content">
        {/* Left: Mobile Menu Toggle & Brand Logo */}
        <div className="brand-section">
          <button
            type="button"
            className="mobile-sidebar-toggle"
            onClick={onToggleMobileSidebar}
            aria-label="Toggle navigation menu"
          >
            <Menu size={20} />
          </button>
          <BrandLogo size="md" isHindi={isHindi} />
        </div>

        {/* Center: Assistant Tagline or Document Pill */}
        <div className="header-center-info hide-on-mobile">
          {activeResult ? (
            <div className="active-notice-indicator" title={activeResult.notice_title}>
              <span className="notice-dot-live" />
              <span className="notice-title-clipped">
                {activeResult.notice_title}
              </span>
            </div>
          ) : (
            <span className="assistant-tagline">
              {isHindi
                ? 'सूचना-से-कार्य योजना नागरिक सहायक (Notice-to-Action)'
                : 'Notice-to-Action Accessibility Assistant'}
            </span>
          )}
        </div>

        {/* Right Actions: System Health, Original Notice, Provider Pill, Provider Dropdown, Lang Toggle */}
        <div className="header-actions">
          {/* Live System Health Pill */}
          <div
            className={`system-health-pill ${health?.status === 'healthy' ? 'healthy' : 'checking'}`}
            title={`Backend Health: ${health?.status === 'healthy' ? 'Operational' : 'Connecting...'}`}
          >
            <span className={`status-dot ${health?.status === 'healthy' ? 'dot-live' : 'dot-warning'}`} />
            <span className="system-health-text">
              {health?.status === 'healthy'
                ? (isHindi ? 'सिस्टम सक्रिय' : 'System Healthy')
                : (isHindi ? 'सिस्टम जांच...' : 'Checking System...')}
            </span>
          </div>

          {/* Original Notice Button (Active when a notice is loaded) */}
          {activeResult && onOpenOriginalNotice && (
            <button
              type="button"
              className="btn-original-notice-header"
              onClick={onOpenOriginalNotice}
              title={isHindi ? 'मूल सरकारी नोटिस देखें' : 'View original uploaded notice / OCR text'}
            >
              <Eye size={14} className="text-emerald-700" />
              <span>{isHindi ? 'मूल नोटिस' : 'Original Notice'}</span>
            </button>
          )}

          {/* Truthful Provider Status Pill (Cloud vs Local vs Mock) */}
          <div
            className={`provider-status-pill ${providerPill.className}`}
            title={providerPill.title}
          >
            <ProviderIcon size={13} className="provider-icon" />
            <span className="provider-pill-label">{providerPill.label}</span>
          </div>

          {/* Provider Selection Dropdown */}
          <div className="provider-select-wrapper">
            <select
              className="header-provider-select"
              value={selectedProvider}
              onChange={(e) => handleProviderSelect(e.target.value)}
              disabled={isSwitchingProvider}
              title="Select LLM Inference Provider"
            >
              {providers.length > 0 ? (
                providers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))
              ) : (
                <>
                  <option value="openrouter">OpenRouter (google/gemma-4-31b-it)</option>
                  <option value="gemini">Google Gemini (gemini-2.5-flash)</option>
                  <option value="ollama">Local Ollama (gemma4:latest)</option>
                  <option value="huggingface">Hugging Face (google/gemma-4-31b-it)</option>
                  <option value="mock">Deterministic Grounding (Offline)</option>
                </>
              )}
            </select>
          </div>

          {/* Language Toggle */}
          <div className="toolbar-lang-toggle" role="group" aria-label="Output Language">
            <button
              type="button"
              className={`lang-pill ${currentLanguage === 'en' ? 'active' : ''}`}
              onClick={() => onLanguageChange('en')}
            >
              EN
            </button>
            <button
              type="button"
              className={`lang-pill ${currentLanguage === 'hi' ? 'active' : ''}`}
              onClick={() => onLanguageChange('hi')}
            >
              हिंदी
            </button>
          </div>

          {/* User Account Menu / Login Action */}
          {currentUser ? (
            <div className="user-account-menu" ref={userDropdownRef}>
              <button
                type="button"
                className="user-account-btn"
                onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                aria-expanded={isUserDropdownOpen}
                aria-haspopup="true"
                title={currentUser.email}
              >
                <div className="user-avatar-badge">
                  {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <span className="user-name-text">
                  {currentUser.name ? currentUser.name.split(' ')[0] : 'Citizen'}
                </span>
                <ChevronDown size={14} className="text-slate-400" />
              </button>

              {isUserDropdownOpen && (
                <div className="user-account-dropdown" role="menu">
                  <div className="user-dropdown-header">
                    <div className="user-dropdown-name">{currentUser.name}</div>
                    <div className="user-dropdown-email">{currentUser.email}</div>
                  </div>
                  <button
                    type="button"
                    className="user-dropdown-item logout"
                    onClick={() => {
                      setIsUserDropdownOpen(false);
                      if (onLogout) onLogout();
                    }}
                    role="menuitem"
                  >
                    <LogOut size={14} />
                    <span>{isHindi ? 'लॉग आउट' : 'Sign Out'}</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              className="user-account-btn font-semibold"
              onClick={() => onNavigateAuth && onNavigateAuth('login')}
            >
              <User size={14} className="text-emerald-700" />
              <span>{isHindi ? 'प्रवेश करें' : 'Sign In'}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
