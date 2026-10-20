import React from 'react';
import { ExternalLink, ArrowUp, Award, Code2, BookOpen } from 'lucide-react';
import { BrandLogo } from './BrandLogo';

interface FooterProps {
  currentLanguage: string;
}

export const Footer: React.FC<FooterProps> = ({ currentLanguage }) => {
  const isHindi = currentLanguage === 'hi';

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <footer className="footer-container" role="contentinfo">
      <div className="footer-inner">
        {/* Top Footer Section */}
        <div className="footer-top-grid">
          {/* Brand Column */}
          <div className="footer-brand-col">
            <BrandLogo size="md" isHindi={isHindi} />
            <p className="footer-mission-text">
              {isHindi
                ? 'सरकारी एवं संस्थागत परिपत्रों की जटिल कानूनी भाषा को हर नागरिक और छात्र के लिए समझने योग्य अगले कदमों में बदलने वाला सुलभ एआई मंच।'
                : 'Bridging the civic information gap by transforming dense bureaucratic notices into plain-language summaries, verified structured facts, and actionable checklists.'}
            </p>
            <div className="footer-hackathon-badge">
              <Award size={15} className="text-emerald-500" />
              <span>
                <strong>Hacktoberfest HackDay 2026</strong> • Track 1: Best Use of Gemma 4
              </span>
            </div>
          </div>

          {/* Quick Navigation Links */}
          <div className="footer-links-col">
            <h4 className="footer-col-title">
              {isHindi ? 'त्वरित नेविगेशन' : 'Platform Navigation'}
            </h4>
            <ul className="footer-links-list">
              <li>
                <button
                  type="button"
                  className="footer-link-btn"
                  onClick={() => scrollToSection('workspace')}
                >
                  {isHindi ? 'नोटिस विश्लेषण कार्यक्षेत्र' : 'Notice Analysis Workspace'}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="footer-link-btn"
                  onClick={() => scrollToSection('demo-notices')}
                >
                  {isHindi ? 'इंटरएक्टिव डेमो परिपत्र' : 'Interactive Demo Circulars'}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="footer-link-btn"
                  onClick={() => scrollToSection('how-it-works')}
                >
                  {isHindi ? '5-चरणीय कार्यप्रणाली' : '5-Step Architecture'}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="footer-link-btn"
                  onClick={() => scrollToSection('why-suchnasetu')}
                >
                  {isHindi ? 'विशेषताएं व मूल सिद्धांत' : 'Core Civic Tech Pillars'}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="footer-link-btn"
                  onClick={() => scrollToSection('privacy')}
                >
                  {isHindi ? 'डेटा गोपनीयता एवं जिम्मेदार एआई' : 'Privacy & Responsible AI'}
                </button>
              </li>
            </ul>
          </div>

          {/* Resources & Technical Links */}
          <div className="footer-links-col">
            <h4 className="footer-col-title">
              {isHindi ? 'तकनीकी संसाधन' : 'Technical & API'}
            </h4>
            <ul className="footer-links-list">
              <li>
                <a
                  href="/docs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="footer-external-link"
                >
                  <Code2 size={14} />
                  <span>{isHindi ? 'फास्टएपीआई स्वैगर प्रलेखन' : 'FastAPI Swagger Docs'}</span>
                  <ExternalLink size={12} />
                </a>
              </li>
              <li>
                <a
                  href="/api/health"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="footer-external-link"
                >
                  <BookOpen size={14} />
                  <span>{isHindi ? 'सिस्टम स्वास्थ्य स्थिति (JSON)' : 'System Health Endpoint'}</span>
                  <ExternalLink size={12} />
                </a>
              </li>
              <li>
                <a
                  href="https://huggingface.co/collections/google/gemma-4-69ce8ad93186d46744cb42f1"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="footer-external-link"
                >
                  <Award size={14} />
                  <span>{isHindi ? 'गूगल जेम्मा 4 संग्रह' : 'Google Gemma 4 Collection'}</span>
                  <ExternalLink size={12} />
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Legal Limitations Statement */}
        <div className="footer-limitations-box">
          <p className="limitations-disclaimer">
            {isHindi
              ? 'अस्वीकरण: सूचना सेतु एआई एक सुलभता सहायक है। यह परिपत्रों को सरल भाषा में समझने और तैयारी को ट्रैक करने में सहायता करता है। यह आधिकारिक सरकारी या कानूनी परामर्श का विकल्प नहीं है। आवेदन करने से पहले मूल आधिकारिक परिपत्र से आवश्यक शर्तों का सत्यापन अवश्य करें।'
              : 'Official Disclaimer: SuchnaSetu AI is an accessibility assistant designed to help users comprehend notices and organize personal action plans. It does not replace official gazette notifications or legal counsel. Always verify critical terms against original issuing authorities before submitting official applications.'}
          </p>
        </div>

        {/* Bottom Copyright Bar */}
        <div className="footer-bottom-bar">
          <p className="copyright-text">
            SuchnaSetu AI (सूचना + सेतु) • Official Solution for <strong>PS 02: Notice-to-Action Accessibility Assistant</strong>
          </p>
          <button
            type="button"
            className="back-to-top-btn"
            onClick={scrollToTop}
            title={isHindi ? 'शीर्ष पर जाएं' : 'Back to top'}
          >
            <span>{isHindi ? 'शीर्ष पर जाएं' : 'Back to Top'}</span>
            <ArrowUp size={14} />
          </button>
        </div>
      </div>
    </footer>
  );
};
