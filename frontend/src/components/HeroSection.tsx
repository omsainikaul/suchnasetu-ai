import React from 'react';
import { ArrowDown, Play, FileText, CheckCircle2, ShieldCheck, ArrowRight, Layers } from 'lucide-react';

interface HeroSectionProps {
  currentLanguage: string;
  onAnalyzeClick: () => void;
  onDemoClick: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  currentLanguage,
  onAnalyzeClick,
  onDemoClick,
}) => {
  const isHindi = currentLanguage === 'hi';

  return (
    <section className="hero-section" aria-labelledby="hero-title">
      <div className="hero-container">
        {/* Left Column: Messaging & CTAs */}
        <div className="hero-content">
          <div className="hero-badge">
            <span className="hero-badge-dot" />
            <span className="hero-badge-text">
              {isHindi
                ? 'हैकाथॉन पीएस 02 • जेम्मा 4 द्वारा संचालित'
                : 'PS 02 Official Solution • Powered by Gemma 4'}
            </span>
          </div>

          <h1 id="hero-title" className="hero-headline">
            {isHindi ? (
              <>
                जटिल सरकारी सूचनाओं से <br />
                <span className="text-gradient">स्पष्ट अगले कदमों तक।</span>
              </>
            ) : (
              <>
                From Complex Notices to <br />
                <span className="text-gradient">Clear Next Steps.</span>
              </>
            )}
          </h1>

          <p className="hero-description">
            {isHindi
              ? 'अक्सर नागरिक व छात्र सरकारी परिपत्रों की कठिन कानूनी शब्दावली के कारण आवेदन से चूक जाते हैं। सूचना सेतु एआई मुद्रित व डिजिटल सूचनाओं को ओसीआर और जेम्मा 4 द्वारा सरल सारांश, छह अनिवार्य तथ्यों और क्रमबद्ध कार्य योजना में बदलता है—बिना किसी मनगढ़ंत जानकारी के।'
              : 'Official notices, scholarships, and university circulars are often dense and legalistic. SuchnaSetu AI bridges this barrier by transforming circulars into plain-language summaries, 6 verified structured facts, and chronological checklists—with strict evidence grounding and honest missing-information reporting.'}
          </p>

          <div className="hero-actions">
            <button
              type="button"
              className="btn btn-primary hero-btn-primary"
              onClick={onAnalyzeClick}
              id="cta-analyze-notice"
            >
              <FileText size={18} />
              <span>{isHindi ? 'नोटिस का विश्लेषण करें' : 'Analyze a Notice'}</span>
              <ArrowDown size={16} />
            </button>

            <button
              type="button"
              className="btn btn-secondary hero-btn-secondary"
              onClick={onDemoClick}
              id="cta-try-demo"
            >
              <Play size={16} className="text-emerald-700" />
              <span>{isHindi ? 'इंटरएक्टिव नमूने देखें' : 'Try Demo Examples'}</span>
            </button>
          </div>

          {/* Trust Guarantees */}
          <div className="hero-trust-bar">
            <div className="trust-item">
              <ShieldCheck size={16} className="text-emerald-600" />
              <span>{isHindi ? 'साक्ष्य-आधारित सत्यापन' : 'Evidence-Grounded Facts'}</span>
            </div>
            <div className="trust-item">
              <CheckCircle2 size={16} className="text-emerald-600" />
              <span>{isHindi ? 'लापता जानकारी पर स्पष्टता' : 'No Hallucinated Data'}</span>
            </div>
            <div className="trust-item">
              <Layers size={16} className="text-emerald-600" />
              <span>{isHindi ? 'द्विभाषी अंग्रेजी व हिंदी' : 'Bilingual English & Hindi'}</span>
            </div>
          </div>
        </div>

        {/* Right Column: Purposeful Transformation Diagram */}
        <div className="hero-visual" aria-hidden="true">
          <div className="transformation-card">
            {/* Source Document Simulation */}
            <div className="trans-panel source-panel">
              <div className="panel-header">
                <span className="dot dot-red" />
                <span className="dot dot-yellow" />
                <span className="dot dot-green" />
                <span className="panel-title">{isHindi ? 'जटिल परिपत्र' : 'Complex Circular'}</span>
              </div>
              <div className="fake-document">
                <div className="fake-doc-header">GOVT. CIRCULAR NO. 894/2026</div>
                <div className="fake-line line-full" />
                <div className="fake-line line-90" />
                <div className="fake-line line-75" />
                <div className="fake-line line-full highlight-jargon">
                  <span>“Subject to clause 4(b)(ii) hereinafter...”</span>
                </div>
                <div className="fake-line line-80" />
                <div className="fake-line line-60" />
              </div>
              <span className="panel-tag tag-source">
                {isHindi ? 'अस्पष्ट समयसीमा व कानूनी भाषा' : 'Buried Deadlines & Jargon'}
              </span>
            </div>

            {/* Connecting Bridge Icon */}
            <div className="trans-bridge">
              <div className="bridge-icon-wrap">
                <ArrowRight size={18} className="bridge-arrow" />
              </div>
              <span className="bridge-label">SuchnaSetu AI</span>
            </div>

            {/* Structured Output Simulation */}
            <div className="trans-panel output-panel">
              <div className="panel-header">
                <span className="panel-title text-emerald-800 font-bold">
                  {isHindi ? 'सुलभ कार्य योजना' : 'Accessible Action Steps'}
                </span>
              </div>
              <div className="structured-preview-list">
                <div className="preview-item">
                  <div className="preview-badge found">✓ Purpose</div>
                  <div className="preview-text">State Merit Scholarship 2026-27</div>
                </div>
                <div className="preview-item">
                  <div className="preview-badge deadline">⏰ Deadline</div>
                  <div className="preview-text">15 Nov 2026 (Needs review)</div>
                </div>
                <div className="preview-item">
                  <div className="preview-badge missing">✕ Income Limit</div>
                  <div className="preview-text text-amber-700">Not stated in notice</div>
                </div>
                <div className="preview-item step-item">
                  <span className="step-num">1</span>
                  <div className="preview-text font-medium">Download Form-A from portal</div>
                </div>
              </div>
              <span className="panel-tag tag-output">
                {isHindi ? 'सत्यापित साक्ष्य व अगले कदम' : '6 Verified Facts + Checklist'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
