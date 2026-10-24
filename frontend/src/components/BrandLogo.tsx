import React from 'react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  isHindi?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  showText = true,
  isHindi = false,
}) => {
  const iconDimensions = {
    sm: 32,
    md: 40,
    lg: 48,
  }[size];

  return (
    <div className={`brand-mark-container size-${size}`}>
      {/* Information Bridge (सूचना + सेतु) Brand Mark */}
      <svg
        width={iconDimensions}
        height={iconDimensions}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="brand-logo-svg"
        aria-hidden="true"
      >
        {/* Rounded Container */}
        <rect width="48" height="48" rx="12" fill="url(#brandGradient)" />
        
        {/* Bridge Pillars / Foundation */}
        <rect x="8" y="32" width="5" height="7" rx="1.5" fill="#ffffff" fillOpacity="0.85" />
        <rect x="35" y="32" width="5" height="7" rx="1.5" fill="#ffffff" fillOpacity="0.85" />
        <rect x="21.5" y="27" width="5" height="12" rx="1.5" fill="#ffffff" fillOpacity="0.95" />

        {/* Bridge Suspension Arch / Information Span */}
        <path
          d="M 10 32 C 16 23, 20 23, 24 23 C 28 23, 32 23, 38 32"
          stroke="#ffffff"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Top Information Deck / Roadway */}
        <line x1="8" y1="21" x2="40" y2="21" stroke="#ffffff" strokeWidth="2.75" strokeLinecap="round" />

        {/* Information Flow Nodes (Transforming complex data into clear steps) */}
        <circle cx="12" cy="13" r="2.5" fill="#a7f3d0" />
        <circle cx="24" cy="11" r="3" fill="#ffffff" />
        <circle cx="36" cy="13" r="2.5" fill="#5eead4" />

        {/* Connection rays from nodes to deck */}
        <line x1="12" y1="15.5" x2="12" y2="21" stroke="#a7f3d0" strokeWidth="1.5" strokeDasharray="1.5 1.5" />
        <line x1="24" y1="14" x2="24" y2="21" stroke="#ffffff" strokeWidth="1.5" />
        <line x1="36" y1="15.5" x2="36" y2="21" stroke="#5eead4" strokeWidth="1.5" strokeDasharray="1.5 1.5" />

        <defs>
          <linearGradient id="brandGradient" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
            <stop stopColor="#047857" />
            <stop offset="0.6" stopColor="#065f46" />
            <stop offset="1" stopColor="#0f766e" />
          </linearGradient>
        </defs>
      </svg>

      {showText && (
        <div className="brand-text-block">
          <div className="brand-primary-line">
            <span className="brand-name">SuchnaSetu</span>
            <span className="brand-ai-chip">AI</span>
            <span className="brand-ps-badge">PS 02</span>
            <span className="brand-hindi-pill">सूचना + सेतु</span>
          </div>
          <p className="brand-tagline">
            {isHindi ? 'जटिल सूचनाओं से स्पष्ट अगले कदम तक' : 'From Complex Notices to Clear Next Steps'}
          </p>
        </div>
      )}
    </div>
  );
};
