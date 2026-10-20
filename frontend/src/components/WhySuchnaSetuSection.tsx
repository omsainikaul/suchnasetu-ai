import React from 'react';
import {
  BookOpen,
  Languages,
  ShieldCheck,
  CheckCircle,
  ListOrdered,
  Sparkles,
} from 'lucide-react';

interface WhySuchnaSetuSectionProps {
  currentLanguage: string;
}

export const WhySuchnaSetuSection: React.FC<WhySuchnaSetuSectionProps> = ({ currentLanguage }) => {
  const isHindi = currentLanguage === 'hi';

  const pillars = [
    {
      title: isHindi ? 'सरल व स्पष्ट भाषा' : 'Plain-Language Explanations',
      desc: isHindi
        ? 'कठिन कानूनी, तकनीकी और प्रशासनिक शब्दावली को रोजमर्रा की स्पष्ट भाषा में अनुवादित करता है, बिना मूल तिथियों या शर्तों को बदले।'
        : 'Strips away bureaucratic jargon and presents official circulars in everyday, easily digestible prose while preserving exact dates, amounts, and titles.',
      icon: BookOpen,
      badge: isHindi ? 'सुगम' : 'Clear',
    },
    {
      title: isHindi ? 'सच्ची बहुभाषी पहुँच' : 'Bilingual Accessibility (EN & HI)',
      desc: isHindi
        ? 'केवल मेन्यू नहीं, बल्कि सारांश, संरचित क्षेत्र, चेकलिस्ट और प्रश्नोत्तर सभी दोनों भाषाओं और उच्चारित ऑडियो में उपलब्ध हैं।'
        : 'Full bilingual workflow across summaries, 6 structured fields, checklists, and Q&A. Includes Web Speech API read-aloud for audio accessibility.',
      icon: Languages,
      badge: isHindi ? 'द्विभाषी' : 'Bilingual',
    },
    {
      title: isHindi ? 'साक्ष्य-आधारित सत्यापन' : 'Evidence-Backed Extractions',
      desc: isHindi
        ? 'हर निष्कर्ष के पीछे परिपत्र से शब्दशः उद्धरण दिया जाता है, जिसे आप मूल दस्तावेज़ में सीधे हाइलाइट करके देख सकते हैं।'
        : 'Every extracted detail is tied directly to verbatim supporting quotes from the notice, fully inspectable in the line-by-line viewer.',
      icon: ShieldCheck,
      badge: isHindi ? 'सत्यापित' : 'Grounded',
    },
    {
      title: isHindi ? 'लापता जानकारी पर पूर्ण ईमानदारी' : 'Honest Missing-Information Handling',
      desc: isHindi
        ? 'यदि परिपत्र में कोई पात्रता या समयसीमा नहीं दी गई है, तो मॉडल अनुमान नहीं लगाता; वह स्पष्ट "उल्लेखित नहीं" बताता है।'
        : 'Strict refusal to hallucinate. If an income threshold or application deadline is omitted from a circular, it is unambiguously flagged as absent.',
      icon: CheckCircle,
      badge: isHindi ? 'ईमानदार' : 'No Hallucinations',
    },
    {
      title: isHindi ? 'कार्रवाई-उन्मुख चेकलिस्ट' : 'Action-Oriented Checklists',
      desc: isHindi
        ? 'सूचना को केवल पढ़ने की बजाय कदम-दर-कदम पूरा करने योग्य चेकलिस्ट में बदलता है, जिसमें आवश्यक दस्तावेज व अंतिम तिथियां शामिल हैं।'
        : 'Transforms passive reading into step-by-step actionable tasks with explicit deadlines, required document enclosures, and personal progress tracking.',
      icon: ListOrdered,
      badge: isHindi ? 'सक्रिय' : 'Actionable',
    },
  ];

  return (
    <section className="why-section" id="why-suchnasetu" aria-labelledby="why-heading">
      <div className="section-header-wrap">
        <div className="section-badge">
          <Sparkles size={13} />
          <span>{isHindi ? 'नागरिक केंद्रित' : 'Core Civic Tech Pillars'}</span>
        </div>
        <h2 id="why-heading" className="section-title">
          {isHindi ? 'सूचना सेतु एआई क्यों?' : 'Why SuchnaSetu AI?'}
        </h2>
        <p className="section-subtitle">
          {isHindi
            ? 'सार्वजनिक सेवा और नागरिक सशक्तिकरण हेतु निर्मित एक भरोसेमंद, सटीक और सुलभ एआई सहायक।'
            : 'Designed as trustworthy, accessible civic technology for students, citizens, and institutions across India.'}
        </p>
      </div>

      <div className="why-pillars-grid">
        {pillars.map((pillar, idx) => {
          const Icon = pillar.icon;

          return (
            <div key={idx} className="pillar-card">
              <div className="pillar-header">
                <div className="pillar-icon-box">
                  <Icon size={20} className="text-emerald-700" />
                </div>
                <span className="pillar-badge">{pillar.badge}</span>
              </div>
              <h3 className="pillar-title">{pillar.title}</h3>
              <p className="pillar-desc">{pillar.desc}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
};
