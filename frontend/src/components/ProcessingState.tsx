import React, { useEffect, useState } from 'react';
import {
  Eye,
  FileSearch,
  BrainCircuit,
  ShieldCheck,
  ListOrdered,
  XCircle,
  Loader2,
} from 'lucide-react';

interface ProcessingStateProps {
  currentLanguage: string;
  isImageSource: boolean;
  onCancel?: () => void;
}

export const ProcessingState: React.FC<ProcessingStateProps> = ({
  currentLanguage,
  isImageSource,
  onCancel,
}) => {
  const isHindi = currentLanguage === 'hi';
  const [currentStage, setCurrentStage] = useState(1);

  const stages = [
    {
      id: 1,
      title: isHindi ? '1. नोटिस पढ़ा जा रहा है' : '1. Reading Notice Document',
      desc: isHindi ? 'फ़ाइल संरचना और इनपुट सत्यापन' : 'Validating format and integrity',
      icon: Eye,
    },
    {
      id: 2,
      title: isHindi
        ? (isImageSource ? '2. RapidOCR द्वारा पाठ निष्कर्षण' : '2. पाठ संरचना का पार्सिंग')
        : (isImageSource ? '2. RapidOCR Character Recognition' : '2. Parsing Notice Structure'),
      desc: isHindi ? 'मुद्रित व देवनागरी वर्णों की पहचान' : 'Neural character extraction & boundaries',
      icon: FileSearch,
    },
    {
      id: 3,
      title: isHindi ? '3. जेम्मा 4 (Gemma 4) द्वारा समझ' : '3. Understanding Key Info with Gemma 4',
      desc: isHindi ? 'उद्देश्य, पात्रता, समय सीमा व दस्तावेजों का विश्लेषण' : 'Extracting 6 mandatory structured fields',
      icon: BrainCircuit,
    },
    {
      id: 4,
      title: isHindi ? '4. साक्ष्य सत्यापन व अनिश्चितता जांच' : '4. Evidence Verification & Grounding',
      desc: isHindi ? 'तथ्यों की शुद्धता व लापता बिंदुओं की पुष्टि' : 'Calibrating citations against hallucinations',
      icon: ShieldCheck,
    },
    {
      id: 5,
      title: isHindi ? '5. कार्य योजना व चेकलिस्ट तैयार' : '5. Preparing Ordered Action Checklist',
      desc: isHindi ? 'व्यावहारिक चरणबद्ध कदमों का निर्माण' : 'Formulating practical next steps',
      icon: ListOrdered,
    },
  ];

  useEffect(() => {
    const timer1 = setTimeout(() => setCurrentStage(2), 700);
    const timer2 = setTimeout(() => setCurrentStage(3), 1600);
    const timer3 = setTimeout(() => setCurrentStage(4), 2600);
    const timer4 = setTimeout(() => setCurrentStage(5), 3600);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, []);

  return (
    <div className="processing-card" role="status" aria-live="polite">
      <div className="processing-inner">
        <div className="processing-header">
          <div className="processing-title-row">
            <Loader2 size={24} className="processing-spinner animate-spin text-emerald-700" />
            <h3 className="processing-title">
              {isHindi
                ? 'सूचना सेतु एआई विश्लेषण प्रगति पर है...'
                : 'SuchnaSetu AI is analyzing your notice...'}
            </h3>
          </div>
          <p className="processing-sub">
            {isHindi
              ? 'सख्त साक्ष्य नियमों के साथ वास्तविक जानकारी निकाली जा रही है। लापता तथ्यों को कभी नहीं गढ़ा जाता।'
              : 'Extracting key facts with strict evidence grounding. Missing details are explicitly reported.'}
          </p>
        </div>

        {/* 5-Step Progress Stack */}
        <div className="stages-stack">
          {stages.map((stage) => {
            const Icon = stage.icon;
            const isCompleted = currentStage > stage.id;
            const isActive = currentStage === stage.id;

            return (
              <div
                key={stage.id}
                className={`stage-row ${isActive ? 'stage-active' : ''} ${isCompleted ? 'stage-completed' : ''}`}
              >
                <div className={`stage-icon-circle ${isActive ? 'icon-active' : ''} ${isCompleted ? 'icon-done' : ''}`}>
                  <Icon size={18} />
                </div>
                <div className="stage-meta">
                  <h4 className="stage-title">{stage.title}</h4>
                  <p className="stage-desc">{stage.desc}</p>
                </div>
                {isActive && (
                  <div className="stage-active-badge">
                    <span className="pulse-dot" />
                    <span>{isHindi ? 'कार्यरत...' : 'In Progress'}</span>
                  </div>
                )}
                {isCompleted && (
                  <div className="stage-done-badge">
                    <span>✓</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Cancel Action if supported */}
        {onCancel && (
          <div className="processing-cancel-row">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={onCancel}
            >
              <XCircle size={15} />
              <span>{isHindi ? 'विश्लेषण रद्द करें' : 'Cancel Analysis'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
