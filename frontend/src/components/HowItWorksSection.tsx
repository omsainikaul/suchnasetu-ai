import React from 'react';
import {
  FileUp,
  ScanText,
  BrainCircuit,
  ShieldCheck,
  CheckCircle2,
  Layers,
} from 'lucide-react';

interface HowItWorksSectionProps {
  currentLanguage: string;
}

export const HowItWorksSection: React.FC<HowItWorksSectionProps> = ({ currentLanguage }) => {
  const isHindi = currentLanguage === 'hi';

  const steps = [
    {
      num: '01',
      title: isHindi ? 'सूचना इनपुट' : 'Notice Input',
      desc: isHindi
        ? 'सरकारी परिपत्र, छात्रवृत्ति आदेश या संस्थागत सूचना की तस्वीर या पाठ अपलोड करें।'
        : 'Upload a circular photo or paste text from scholarships, colleges, or government bodies.',
      icon: FileUp,
      color: 'emerald',
    },
    {
      num: '02',
      title: isHindi ? 'ओसीआर निष्कर्षण' : 'RapidOCR Extraction',
      desc: isHindi
        ? 'न्यूरल ओसीआर इंजन द्वारा अंग्रेजी व देवनागरी मुद्रित अक्षरों की स्पष्ट पहचान की जाती है।'
        : 'Embedded ONNX neural OCR extracts characters and structural lines with high accuracy.',
      icon: ScanText,
      color: 'teal',
    },
    {
      num: '03',
      title: isHindi ? 'जेम्मा 4 द्वारा समझ' : 'Gemma 4 Understanding',
      desc: isHindi
        ? 'गूगल डीपमाइंड का जेम्मा 4 मॉडल कानूनी शब्दावली का विश्लेषण कर मुख्य तथ्यों को समझता है।'
        : 'Gemma 4 analyzes dense institutional jargon to identify requirements, rules, and dates.',
      icon: BrainCircuit,
      color: 'blue',
    },
    {
      num: '04',
      title: isHindi ? 'साक्ष्य व अनिश्चितता जांच' : 'Evidence Grounding',
      desc: isHindi
        ? 'सत्यापन परत हर तथ्य का मिलान मूल पाठ से करती है। लापता तथ्यों को स्पष्ट "उल्लेखित नहीं" कहा जाता है।'
        : 'Strict anti-hallucination rules calibrate quotes. Missing facts are marked "Not stated in notice."',
      icon: ShieldCheck,
      color: 'amber',
    },
    {
      num: '05',
      title: isHindi ? 'सुलभ कार्य योजना' : 'Take Clear Action',
      desc: isHindi
        ? 'सरल सारांश, ऑडियो उच्चारण और क्रमबद्ध चेकलिस्ट के साथ समय पर आवेदन पूरा करें।'
        : 'Citizens receive plain-language summaries, bilingual audio, and chronological checklists.',
      icon: CheckCircle2,
      color: 'emerald',
    },
  ];

  return (
    <section className="how-it-works-section" id="how-it-works" aria-labelledby="hiw-heading">
      <div className="section-header-wrap">
        <div className="section-badge">
          <Layers size={13} />
          <span>{isHindi ? 'कार्यप्रणाली' : 'Architecture & Pipeline'}</span>
        </div>
        <h2 id="hiw-heading" className="section-title">
          {isHindi ? 'सूचना सेतु कैसे काम करता है?' : 'How SuchnaSetu AI Works'}
        </h2>
        <p className="section-subtitle">
          {isHindi
            ? 'सूचना से कार्रवाई तक: 5-चरणीय पारदर्शी एवं साक्ष्य-आधारित कार्यप्रवाह।'
            : 'From complex circular to verified next steps: a 5-step evidence-grounded workflow.'}
        </p>
      </div>

      <div className="pipeline-steps-grid">
        {steps.map((step, idx) => {
          const Icon = step.icon;

          return (
            <div key={idx} className="pipeline-step-card">
              <div className="step-card-header">
                <span className="step-number-tag">{step.num}</span>
                <div className={`step-icon-wrap icon-theme-${step.color}`}>
                  <Icon size={20} />
                </div>
              </div>
              <h3 className="step-title">{step.title}</h3>
              <p className="step-desc">{step.desc}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
};
