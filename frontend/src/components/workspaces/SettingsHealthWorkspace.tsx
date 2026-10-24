import React, { useState, useEffect } from 'react';
import {
  Settings,
  Activity,
  Cpu,
  RefreshCw,
  Lock,
  FileCheck2,
} from 'lucide-react';
import type { HealthStatus, SystemConfig, ProviderInfo } from '../../types';
import { fetchProviders, selectProvider } from '../../services/api';

interface SettingsHealthWorkspaceProps {
  currentLanguage: string;
  config?: SystemConfig | null;
  health: HealthStatus | null;
  onRefreshHealth: () => void;
  onProviderChanged?: (id: string) => void;
}

export const SettingsHealthWorkspace: React.FC<SettingsHealthWorkspaceProps> = ({
  currentLanguage,
  health,
  onRefreshHealth,
  onProviderChanged,
}) => {
  const isHindi = currentLanguage === 'hi';
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>('openrouter');
  const [isSwitching, setIsSwitching] = useState<boolean>(false);
  const [switchMessage, setSwitchMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchProviders()
      .then((data) => {
        setProviders(data);
        const cur = data.find((p) => p.is_current);
        if (cur) setSelectedProvider(cur.id);
        else if (health?.model_provider) setSelectedProvider(health.model_provider);
      })
      .catch((err) => console.warn('Provider fetch error:', err));
  }, [health]);

  const handleSelect = async (pId: string) => {
    setSelectedProvider(pId);
    setIsSwitching(true);
    setSwitchMessage(null);
    try {
      await selectProvider(pId);
      setSwitchMessage(isHindi ? `प्रदाता सफलतापूर्वक बदल गया: ${pId}` : `Provider switched to: ${pId}`);
      if (onProviderChanged) onProviderChanged(pId);
      onRefreshHealth();
    } catch (err: any) {
      setSwitchMessage(isHindi ? 'प्रदाता बदलने में त्रुटि' : `Switch failed: ${err.message}`);
    } finally {
      setIsSwitching(false);
    }
  };

  return (
    <div className="settings-workspace-container">
      {/* 1. Header Bar */}
      <div className="workspace-header-bar">
        <div>
          <div className="workspace-title-row">
            <Settings size={22} className="text-emerald-700" />
            <h2 className="workspace-title">
              {isHindi ? 'सिस्टम सेटिंग्स और स्वास्थ्य' : 'System Settings & Operational Health'}
            </h2>
          </div>
          <p className="workspace-subtitle">
            {isHindi
              ? 'एआई मॉडल प्रदाता, ओसीआर इंजन स्थिति, सिस्टम स्वास्थ्य और सत्यवादी गोपनीयता कॉन्फ़िगरेशन।'
              : 'Runtime configuration, real-time backend health, truthful inference disclosures, and model provider selection.'}
          </p>
        </div>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={onRefreshHealth}
        >
          <RefreshCw size={14} />
          <span>{isHindi ? 'ताज़ा करें' : 'Refresh Telemetry'}</span>
        </button>
      </div>

      {switchMessage && (
        <div className="system-notice-banner" role="status">
          <Activity size={16} className="text-emerald-700" />
          <span>{switchMessage}</span>
        </div>
      )}

      {/* 2. Core Service Health Cards */}
      <div className="settings-cards-grid">
        {/* Card 1: Backend Health */}
        <div className="settings-card">
          <div className="settings-card-header">
            <Activity size={18} className="text-emerald-700" />
            <h3>{isHindi ? 'बैकएंड स्वास्थ्य' : 'Backend Service Health'}</h3>
            <span className={`status-pill ${health?.status === 'healthy' ? 'pill-success' : 'pill-warning'}`}>
              {health?.status === 'healthy' ? 'OPERATIONAL' : 'OFFLINE / UNHEALTHY'}
            </span>
          </div>

          <div className="settings-keyval-list">
            <div className="keyval-row">
              <span className="keyval-label">{isHindi ? 'सिस्टम नाम:' : 'System Name:'}</span>
              <span className="keyval-val">{health?.project || 'SuchnaSetu AI'}</span>
            </div>
            <div className="keyval-row">
              <span className="keyval-label">{isHindi ? 'संस्करण:' : 'Version:'}</span>
              <span className="keyval-val">{health?.version || '1.0.0'}</span>
            </div>
            <div className="keyval-row">
              <span className="keyval-label">{isHindi ? 'लाइव अनुमान उपलब्ध:' : 'Live Inference Available:'}</span>
              <span className="keyval-val font-semibold text-emerald-700">
                {health?.live_inference_available ? 'Yes (Connected)' : 'No (Deterministic Fallback)'}
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: OCR Engine Status */}
        <div className="settings-card">
          <div className="settings-card-header">
            <FileCheck2 size={18} className="text-emerald-700" />
            <h3>{isHindi ? 'ओसीआर इंजन स्थिति' : 'OCR & PDF Engines'}</h3>
            <span className={`status-pill ${health?.ocr_ready ? 'pill-success' : 'pill-warning'}`}>
              {health?.ocr_ready ? 'READY' : 'DEGRADED'}
            </span>
          </div>

          <div className="settings-keyval-list">
            <div className="keyval-row">
              <span className="keyval-label">{isHindi ? 'प्राथमिक इंजन:' : 'Primary Engine:'}</span>
              <span className="keyval-val font-mono">RapidOCR (ONNX Runtime)</span>
            </div>
            <div className="keyval-row">
              <span className="keyval-label">{isHindi ? 'पीडीएफ रेखांकन:' : 'PDF Rasterization:'}</span>
              <span className="keyval-val font-mono">pypdfium2 (2.0x Hi-Res)</span>
            </div>
            <div className="keyval-row">
              <span className="keyval-label">{isHindi ? 'द्वितीयक फ़ॉलबैक:' : 'Secondary Fallback:'}</span>
              <span className="keyval-val font-mono">Tesseract OCR (eng+hin)</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Inference Provider Selection & Truthful Privacy Disclosure */}
      <div className="settings-card full-width-card">
        <div className="settings-card-header">
          <Cpu size={18} className="text-emerald-700" />
          <h3>{isHindi ? 'एआई मॉडल प्रदाता चयन और गोपनीयता' : 'AI Model Provider & Truthful Privacy Disclosure'}</h3>
        </div>

        <div className="provider-selector-section">
          <p className="provider-selector-desc">
            {isHindi
              ? 'वर्तमान में सक्रिय एलएलएम मॉडल प्रदाता चुनें। ध्यान दें कि क्लाउड और स्थानीय प्रदाताओं में भिन्न गोपनीयता स्तर होते हैं।'
              : 'Select the active inference backend. Notice text routing differs across cloud and offline architectures:'}
          </p>

          <div className="provider-cards-grid">
            {providers.map((p) => {
              const isSelected = selectedProvider === p.id;
              let isCloud = p.id === 'openrouter' || p.id === 'gemini' || p.id === 'huggingface';
              let isLocal = p.id === 'ollama';

              return (
                <div
                  key={p.id}
                  className={`provider-card-selectable ${isSelected ? 'selected' : ''} ${isSwitching ? 'opacity-70 pointer-events-none' : ''}`}
                  onClick={() => !isSwitching && handleSelect(p.id)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="provider-card-top">
                    <span className="provider-name">{p.name}</span>
                    {isSelected && (
                      <span className="provider-active-badge">{isHindi ? 'सक्रिय' : 'ACTIVE'}</span>
                    )}
                  </div>
                  <div className="provider-model-code">
                    <code>{p.model}</code>
                  </div>
                  <div className="provider-privacy-tag">
                    {isLocal && (
                      <span className="text-emerald-700">🔒 100% Local / Zero-Transmission</span>
                    )}
                    {isCloud && (
                      <span className="text-amber-700">🌐 Cloud API via Encrypted HTTPS</span>
                    )}
                    {p.id === 'mock' && (
                      <span className="text-slate-600">🛡️ 100% Offline Rule-Based Mock</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Truthful Privacy Statement */}
          <div className="truthful-privacy-box">
            <Lock size={16} className="text-emerald-700 flex-shrink-0" />
            <div className="privacy-text-block">
              <strong>{isHindi ? 'सत्यवादी गोपनीयता घोषणा:' : 'Truthful Privacy Declaration:'}</strong>{' '}
              {selectedProvider === 'openrouter' || selectedProvider === 'gemini'
                ? (isHindi
                  ? 'वर्तमान में क्लाउड प्रदाता चयनित है। नोटिस का पाठ विश्लेषण के लिए सुरक्षित एचटीटीपीएस के माध्यम से रिमोट एपीआई को भेजा जाता है। इसे 100% स्थानीय प्रसंस्करण नहीं कहा जा सकता है।'
                  : 'A Cloud API provider is currently selected. Notice text is transmitted over secure HTTPS to the external API for inference. We do not mislabel remote cloud API calls as 100% local or private.')
                : (isHindi
                  ? 'स्थानीय अथवा ऑफ़लाइन प्रदाता चयनित है। कोई भी नोटिस पाठ बाहरी सर्वर पर प्रेषित नहीं किया जाता है।'
                  : 'An offline or local model provider is currently active. Your document text never leaves your local network environment.')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
