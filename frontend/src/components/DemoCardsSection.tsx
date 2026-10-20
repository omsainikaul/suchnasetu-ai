import React from 'react';
import { GraduationCap, Briefcase, Droplets, AlertTriangle, ArrowRight, HelpCircle, Sparkles } from 'lucide-react';
import type { DemoNotice } from '../types';

interface DemoCardsSectionProps {
  demoNotices: DemoNotice[];
  currentLanguage: string;
  onSelectDemo: (demo: DemoNotice) => void;
  isLoading: boolean;
}

export const DemoCardsSection: React.FC<DemoCardsSectionProps> = ({
  demoNotices,
  currentLanguage,
  onSelectDemo,
  isLoading,
}) => {
  const isHindi = currentLanguage === 'hi';

  const getDemoIcon = (id: string) => {
    if (id.includes('scholarship')) {
      return <GraduationCap size={22} className="text-emerald-700" />;
    }
    if (id.includes('placement')) {
      return <Briefcase size={22} className="text-teal-700" />;
    }
    return <Droplets size={22} className="text-blue-700" />;
  };

  return (
    <section className="demo-section" id="demo-notices" aria-labelledby="demo-heading">
      <div className="section-header-wrap">
        <div className="section-badge">
          <Sparkles size={13} />
          <span>{isHindi ? 'आधिकारिक परीक्षण नमूने' : 'Evaluation Scenarios'}</span>
        </div>
        <h2 id="demo-heading" className="section-title">
          {isHindi
            ? 'वास्तविक परिपत्र परिदृश्य (इंटरएक्टिव डेमो)'
            : 'Interactive Demonstration Circulars'}
        </h2>
        <p className="section-subtitle">
          {isHindi
            ? 'नीचे दिए गए तीनों उदाहरण पीएस 02 की मुख्य कसौटियों (लापता आवश्यकताएं, अस्पष्ट समयसीमाएं व ओसीआर अनिश्चितता) की पुष्टि हेतु विशेष रूप से तैयार किए गए हैं।'
            : 'These three curated scenarios test critical PS 02 requirements: honest rejection of absent requirements, missing deadlines, and human-in-the-loop confirmation.'}
        </p>
      </div>

      <div className="demo-cards-grid">
        {demoNotices.map((demo) => {
          return (
            <article key={demo.id} className="demo-card">
              {/* Card Header */}
              <div className="demo-card-top">
                <div className="demo-icon-box">
                  {getDemoIcon(demo.id)}
                </div>
                <div className="demo-category-badge">
                  {demo.category}
                </div>
              </div>

              {/* Title & Description */}
              <div className="demo-card-body">
                <h3 className="demo-card-title">
                  {isHindi ? demo.title_hi || demo.title : demo.title}
                </h3>
                <p className="demo-card-desc">
                  {isHindi ? demo.description_hi || demo.description : demo.description}
                </p>

                {/* Intentional Absent & Uncertain Feature Indicators */}
                <div className="demo-feature-tags">
                  {demo.has_missing_field && (
                    <div className="feature-tag tag-missing" title="Demonstrates system refusing to hallucinate absent requirements">
                      <HelpCircle size={13} />
                      <span>
                        {isHindi ? 'लापता तथ्य: ' : 'Intentionally Absent: '}
                        <strong>{demo.missing_field_name || (isHindi ? 'विवरण' : 'Field')}</strong>
                      </span>
                    </div>
                  )}

                  {demo.has_uncertain_field && (
                    <div className="feature-tag tag-uncertain" title="Demonstrates human-in-the-loop review badge (Requirement R7)">
                      <AlertTriangle size={13} />
                      <span>
                        {isHindi ? 'समीक्षा आवश्यक: ' : 'Needs Confirmation: '}
                        <strong>{demo.uncertain_field_name || (isHindi ? 'अस्पष्ट समय' : 'Format')}</strong>
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Card Footer: Action & Synthetic Label */}
              <div className="demo-card-footer">
                <div className="demo-disclaimer-chip">
                  <span>{isHindi ? 'सिंथेटिक डेमो नमूना (हैकडे 2026)' : 'Synthetic Demo Circular (HackDay 2026)'}</span>
                </div>

                <button
                  type="button"
                  className="btn btn-demo-action"
                  onClick={() => onSelectDemo(demo)}
                  disabled={isLoading}
                  id={`btn-demo-${demo.id}`}
                >
                  <span>{isHindi ? 'यह उदाहरण चलाएं' : 'Run This Example'}</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};
