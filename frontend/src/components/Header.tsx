import React from 'react';
import { Layers, Sparkles, Cpu } from 'lucide-react';
import type { SystemConfig } from '../types';

interface HeaderProps {
  currentLanguage: string;
  onLanguageChange: (lang: string) => void;
  config: SystemConfig | null;
}

export const Header: React.FC<HeaderProps> = ({
  currentLanguage,
  onLanguageChange,
  config
}) => {
  const isHindi = currentLanguage === 'hi';

  return (
    <header className="header-wrapper" role="banner">
      <div className="header-content">
        <div className="brand-section">
          <div className="brand-logo-icon" aria-hidden="true">
            <Layers size={24} />
          </div>
          <div className="brand-titles">
            <h1>
              <span>SuchnaSetu AI</span>
              <span className="brand-hindi">सूचना + सेतु</span>
            </h1>
            <p className="brand-tagline">
              {isHindi ? '“जटिल सूचनाओं से स्पष्ट अगले कदम तक।”' : '“From Complex Notices to Clear Next Steps.”'}
            </p>
          </div>
        </div>

        <div className="header-actions">
          {/* Hackathon Badge */}
          <span className="badge badge-event" title="Official Problem Statement 02 - Track 1">
            <Sparkles size={13} className="text-emerald-600" />
            <span>PS 02 • Track 1</span>
          </span>

          {/* Gemma 4 Model Badge */}
          <span className="badge badge-model" title={config ? `Model: ${config.gemma_model} (${config.provider})` : 'Powered by Gemma 4'}>
            <Cpu size={13} />
            <span>Gemma 4 {config?.live_inference ? '• Live API' : '• Ready'}</span>
          </span>

          {/* Language Switcher */}
          <div className="lang-selector-group" role="group" aria-label="Language selector">
            <button
              type="button"
              className={`lang-btn ${currentLanguage === 'en' ? 'active' : ''}`}
              onClick={() => onLanguageChange('en')}
              aria-pressed={currentLanguage === 'en'}
            >
              English
            </button>
            <button
              type="button"
              className={`lang-btn ${currentLanguage === 'hi' ? 'active' : ''}`}
              onClick={() => onLanguageChange('hi')}
              aria-pressed={currentLanguage === 'hi'}
            >
              हिंदी
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
