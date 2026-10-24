import React, { useState } from 'react';
import {
  Clock,
  Trash2,
  FolderOpen,
  Calendar,
  ShieldCheck,
  Cpu,
  Info,
} from 'lucide-react';
import type { StoredNoticeSummary } from '../../types';
import { getNoticeHistory, deleteNoticeFromHistory, clearAllNoticeHistory } from '../../services/storage';

interface NoticeHistoryWorkspaceProps {
  currentLanguage: string;
  onReopenNotice: (documentId: string) => void;
  onNavigateWorkspace: (id: any) => void;
  userId?: string;
  onHistoryCountChange?: (count: number) => void;
}

export const NoticeHistoryWorkspace: React.FC<NoticeHistoryWorkspaceProps> = ({
  currentLanguage,
  onReopenNotice,
  onNavigateWorkspace,
  userId,
  onHistoryCountChange,
}) => {
  const isHindi = currentLanguage === 'hi';
  const [historyItems, setHistoryItems] = useState<StoredNoticeSummary[]>(() => getNoticeHistory(userId));

  const reloadHistory = () => {
    const items = getNoticeHistory(userId);
    setHistoryItems(items);
    if (onHistoryCountChange) {
      onHistoryCountChange(items.length);
    }
  };

  const handleDelete = (docId: string) => {
    deleteNoticeFromHistory(docId, userId);
    reloadHistory();
  };

  const handleClearAll = () => {
    if (window.confirm(isHindi ? 'क्या आप निश्चित रूप से संपूर्ण इतिहास मिटाना चाहते हैं?' : 'Are you sure you want to clear all stored circular history?')) {
      clearAllNoticeHistory(userId);
      reloadHistory();
    }
  };

  return (
    <div className="history-workspace-container">
      {/* 1. Header Bar */}
      <div className="workspace-header-bar">
        <div>
          <div className="workspace-title-row">
            <Clock size={22} className="text-emerald-700" />
            <h2 className="workspace-title">
              {isHindi ? 'सहेजा गया नोटिस इतिहास' : 'Analyzed Notice History'}
            </h2>
          </div>
          <p className="workspace-subtitle">
            {isHindi
              ? 'आपके स्थानीय ब्राउज़र में सुरक्षित रूप से सहेजे गए पूर्व परिपत्रों की सूची।'
              : 'Previously analyzed notices stored locally in your browser session for quick review and reopening.'}
          </p>
        </div>

        {historyItems.length > 0 && (
          <button
            type="button"
            className="btn btn-secondary text-danger"
            onClick={handleClearAll}
          >
            <Trash2 size={14} />
            <span>{isHindi ? 'इतिहास साफ़ करें' : 'Clear All History'}</span>
          </button>
        )}
      </div>

      {/* 2. Privacy Disclosure Note */}
      <div className="history-privacy-banner" role="note">
        <Info size={16} className="text-emerald-700" />
        <span>
          {isHindi
            ? 'गोपनीयता सूचना: आपका विश्लेषण इतिहास केवल आपके डिवाइस के स्थानीय स्टोरेज में रहता है। यह किसी बाहरी सर्वर पर संग्रहीत नहीं किया जाता है।'
            : 'Privacy Assurance: Notice history is stored 100% locally on your browser. No historical document dossiers are retained on external servers.'}
        </span>
      </div>

      {/* 3. Notice History List or Empty State */}
      {historyItems.length === 0 ? (
        <div className="empty-workspace-state">
          <Clock size={40} className="empty-state-icon text-slate-400" />
          <h3>{isHindi ? 'कोई पूर्व नोटिस नहीं मिला' : 'No Circular History Yet'}</h3>
          <p>
            {isHindi
              ? 'जैसे ही आप किसी नोटिस का विश्लेषण करेंगे, वह त्वरित पहुंच के लिए यहां प्रदर्शित होगा।'
              : 'When you upload and analyze a notice, it will be automatically indexed here for instant recall.'}
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => onNavigateWorkspace('ingestion')}
          >
            {isHindi ? 'नया नोटिस जोड़ें' : 'Analyze First Notice'}
          </button>
        </div>
      ) : (
        <div className="history-cards-grid">
          {historyItems.map((item) => {
            const savedDate = new Date(item.savedAt).toLocaleDateString(isHindi ? 'hi-IN' : 'en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div key={item.documentId} className="history-item-card">
                <div className="history-card-top">
                  <span className="history-doc-pill">ID: {item.documentId}</span>
                  <span className="history-date">{savedDate}</span>
                </div>

                <h4 className="history-item-title">{item.noticeTitle}</h4>

                <div className="history-meta-badges">
                  <span className="history-meta-chip">
                    <ShieldCheck size={12} className="text-emerald-700" />
                    <span>{item.groundedFieldsCount}/6 {isHindi ? 'तथ्य पुष्ट' : 'Facts Grounded'}</span>
                  </span>

                  {item.deadline && (
                    <span className="history-meta-chip">
                      <Calendar size={12} className="text-amber-700" />
                      <span>{item.deadline}</span>
                    </span>
                  )}

                  <span className="history-meta-chip">
                    <Cpu size={12} />
                    <span>{item.sourceType.toUpperCase()}</span>
                  </span>
                </div>

                <div className="history-card-actions">
                  <button
                    type="button"
                    className="btn-history-reopen"
                    onClick={() => onReopenNotice(item.documentId)}
                    title={isHindi ? 'इस नोटिस को पुनः खोलें' : 'Reopen and view analysis results'}
                  >
                    <FolderOpen size={14} />
                    <span>{isHindi ? 'पुनः खोलें' : 'Reopen in Workspace'}</span>
                  </button>

                  <button
                    type="button"
                    className="btn-history-delete"
                    onClick={() => handleDelete(item.documentId)}
                    title={isHindi ? 'इतिहास से हटाएं' : 'Delete from history'}
                    aria-label="Delete notice from history"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
