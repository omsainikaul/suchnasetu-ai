import React from 'react';
import {
  Lock,
  Cpu,
  Server,
  FileCheck,
} from 'lucide-react';
import type { SystemConfig, HealthStatus } from '../types';

interface PrivacySectionProps {
  currentLanguage: string;
  config: SystemConfig | null;
  health: HealthStatus | null;
}

export const PrivacySection: React.FC<PrivacySectionProps> = ({
  currentLanguage,
  config,
  health,
}) => {
  const isHindi = currentLanguage === 'hi';
  const provider = health?.model_provider || config?.provider || 'openrouter';
  const isLive = health?.live_inference_available ?? config?.live_inference ?? false;

  return (
    <section className="privacy-section" id="privacy" aria-labelledby="privacy-heading">
      <div className="section-header-wrap">
        <div className="section-badge">
          <Lock size={13} />
          <span>{isHindi ? 'सुरक्षा एवं गोपनीयता' : 'Privacy & Trust'}</span>
        </div>
        <h2 id="privacy-heading" className="section-title">
          {isHindi ? 'डेटा गोपनीयता एवं जिम्मेदार एआई' : 'Privacy, Security & Responsible AI'}
        </h2>
        <p className="section-subtitle">
          {isHindi
            ? 'सूचना सेतु एआई का डेटा प्रसंस्करण मॉडल पारदर्शी, जिम्मेदार और नागरिक-हितैषी नियमों पर आधारित है।'
            : 'Derived directly from our actual technical architecture, local OCR engine, and zero-retention session storage.'}
        </p>
      </div>

      <div className="privacy-grid">
        {/* Item 1: Local RapidOCR Processing */}
        <div className="privacy-card">
          <div className="privacy-card-icon">
            <Cpu size={22} className="text-emerald-700" />
          </div>
          <h3 className="privacy-card-title">
            {isHindi ? 'स्थानीय ओसीआर निष्कर्षण (RapidOCR)' : 'Local OCR Processing (RapidOCR)'}
          </h3>
          <p className="privacy-card-desc">
            {isHindi
              ? 'अपलोड की गई छवियों का पाठ स्थानीय रूप से ONNX न्यूरल मॉडल द्वारा निकाला जाता है। छवियां किसी बाहरी क्लाउड स्टोरेज या स्थायी डेटाबेस में सहेजी नहीं जाती हैं।'
              : 'Uploaded notice images are processed locally on the host server via RapidOCR (ONNX runtime). Photos are not uploaded to third-party image hosts or permanent storage.'}
          </p>
        </div>

        {/* Item 2: Inference Transparency */}
        <div className="privacy-card">
          <div className="privacy-card-icon">
            <Server size={22} className="text-teal-700" />
          </div>
          <h3 className="privacy-card-title">
            {isHindi ? 'पारदर्शी मॉडल इनफेरेंस' : 'Transparent Model Inference'}
          </h3>
          <p className="privacy-card-desc">
            {isLive ? (
              isHindi
                ? `वर्तमान में सिस्टम लाइव ${provider} गेटवे के माध्यम से ${health?.gemma_model || 'Gemma 4'} का उपयोग कर रहा है। डेटा केवल सक्रिय अनुरोध के दौरान एन्क्रिप्टेड HTTPS द्वारा प्रेषित होता है।`
                : `Active configuration uses live ${provider} API with model ${health?.gemma_model || 'google/gemma-4-31b-it'} via encrypted HTTPS during active analysis.`
            ) : (
              isHindi
                ? 'वर्तमान में ऑफ़लाइन मूल्यांकन एडाप्टर सक्रिय है। कोई भी बाहरी एपीआई कॉल नहीं की जाती; सभी नियम 100% स्थानीय रूप से जांची जाती हैं।'
                : 'Deterministic Evaluation Adapter is active. No external network requests are made; analysis and Q&A run 100% locally for competition evaluation.'
            )}
          </p>
        </div>

        {/* Item 3: Zero Persistent Retention */}
        <div className="privacy-card">
          <div className="privacy-card-icon">
            <Lock size={22} className="text-blue-700" />
          </div>
          <h3 className="privacy-card-title">
            {isHindi ? 'अल्पकालिक सत्र भंडारण (In-Memory)' : 'Volatile In-Memory Sessions'}
          </h3>
          <p className="privacy-card-desc">
            {isHindi
              ? 'दस्तावेज़ केवल उपयोगकर्ता के सक्रिय सत्र के लिए मेमोरी (RAM) में रखे जाते हैं। सर्वर पुनरारंभ होने पर सभी सत्र डेटा स्वतः समाप्त हो जाता है।'
              : 'Analysis results and notice texts are stored only in volatile server memory (RAM) to power follow-up questions during your active browser session.'}
          </p>
        </div>

        {/* Item 4: Administrative Disclaimer */}
        <div className="privacy-card">
          <div className="privacy-card-icon">
            <FileCheck size={22} className="text-amber-700" />
          </div>
          <h3 className="privacy-card-title">
            {isHindi ? 'कानूनी एवं प्रशासनिक अस्वीकरण' : 'Official Limitations Disclaimer'}
          </h3>
          <p className="privacy-card-desc">
            {isHindi
              ? 'सूचना सेतु एआई नागरिकों की सहायता हेतु एक सुगमकारी उपकरण है। यह आधिकारिक सरकारी सत्यापन या कानूनी परामर्श का विकल्प नहीं है।'
              : 'SuchnaSetu AI is an accessibility assistant designed to help citizens understand notices. It does not replace official gazette notifications or legal counsel.'}
          </p>
        </div>
      </div>
    </section>
  );
};
