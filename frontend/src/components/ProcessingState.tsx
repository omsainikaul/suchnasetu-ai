import React, { useEffect, useState } from 'react';
import { Eye, FileSearch, BrainCircuit, ShieldCheck, ListOrdered } from 'lucide-react';

interface ProcessingStateProps {
  currentLanguage: string;
  isImageSource: boolean;
}

export const ProcessingState: React.FC<ProcessingStateProps> = ({ currentLanguage, isImageSource }) => {
  const isHindi = currentLanguage === 'hi';
  const [currentStage, setCurrentStage] = useState(1);

  const stages = [
    {
      id: 1,
      title: isHindi ? '1. नोटिस पढ़ा जा रहा है' : '1. Reading Notice Document',
      desc: isHindi ? 'फ़ाइल प्रारूप और इनपुट का सत्यापन' : 'Validating format and integrity',
      icon: Eye
    },
    {
      id: 2,
      title: isHindi ? (isImageSource ? '2. ओसीआर (OCR) पाठ निष्कर्षण' : '2. पाठ संरचना की जांच') : (isImageSource ? '2. RapidOCR Character Recognition' : '2. Parsing Notice Structure'),
      desc: isHindi ? 'मुद्रित व देवनागरी अक्षरों की पहचान' : 'Recognizing text and boundary lines',
      icon: FileSearch
    },
    {
      id: 3,
      title: isHindi ? '3. जेम्मा 4 (Gemma 4) द्वारा समझ' : '3. Understanding Key Info with Gemma 4',
      desc: isHindi ? 'उद्देश्य, पात्रता, समय सीमा व दस्तावेजों की पहचान' : 'Extracting 6 mandatory structured fields',
      icon: BrainCircuit
    },
    {
      id: 4,
      title: isHindi ? '4. साक्ष्य सत्यापन व अनिश्चितता जांच' : '4. Evidence Verification & Grounding',
      desc: isHindi ? 'तथ्यों की शुद्धता व लापता बिंदुओं की पुष्टि' : 'Checking source quotes against hallucinations',
      icon: ShieldCheck
    },
    {
      id: 5,
      title: isHindi ? '5. क्रमबद्ध कार्य योजना तैयार' : '5. Preparing Ordered Action Checklist',
      desc: isHindi ? 'कार्रवाई योग्य चरणों का निर्माण' : 'Formulating practical next steps',
      icon: ListOrdered
    }
  ];

  useEffect(() => {
    const timer1 = setTimeout(() => setCurrentStage(2), 600);
    const timer2 = setTimeout(() => setCurrentStage(3), 1400);
    const timer3 = setTimeout(() => setCurrentStage(4), 2200);
    const timer4 = setTimeout(() => setCurrentStage(5), 3000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, []);

  return (
    <div className="card" style={{ padding: '2rem 1.5rem', textAlign: 'center', margin: '1.5rem 0' }} role="status" aria-live="polite">
      <div style={{ maxWidth: '640px', margin: '0 auto' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--slate-800)', marginBottom: '0.4rem' }}>
          {isHindi ? 'सूचना सेतु कार्य प्रगति पर है...' : 'SuchnaSetu AI is processing your notice...'}
        </h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--slate-500)', marginBottom: '1.75rem' }}>
          {isHindi ? 'सख्त साक्ष्य नियमों के साथ वास्तविक जानकारी निकाली जा रही है।' : 'Grounding key information strictly in the document without inventing missing details.'}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', textAlign: 'left' }}>
          {stages.map((stage) => {
            const Icon = stage.icon;
            const isCompleted = currentStage > stage.id;
            const isActive = currentStage === stage.id;

            return (
              <div
                key={stage.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: isActive ? 'var(--primary-50)' : isCompleted ? '#ffffff' : 'var(--slate-50)',
                  border: isActive ? '1px solid var(--primary-500)' : isCompleted ? '1px solid var(--primary-200)' : '1px solid var(--slate-200)',
                  opacity: isActive || isCompleted ? 1 : 0.5,
                  transition: 'all 0.25s ease'
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: isActive ? 'var(--primary-600)' : isCompleted ? 'var(--primary-100)' : 'var(--slate-200)',
                    color: isActive ? '#ffffff' : isCompleted ? 'var(--primary-800)' : 'var(--slate-500)',
                    flexShrink: 0,
                  }}
                >
                  <Icon size={18} />
                </div>
                <div>
                  <h4 style={{ fontSize: '0.92rem', fontWeight: 600, color: isActive ? 'var(--primary-900)' : 'var(--slate-800)' }}>
                    {stage.title}
                  </h4>
                  <p style={{ fontSize: '0.78rem', color: 'var(--slate-500)' }}>
                    {stage.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
