import React, { useState } from 'react';
import {
  LayoutDashboard,
  FileText,
  Search,
  ListOrdered,
  GitCompare,
  UserCheck,
  MessageSquareText,
  Compass,
  History,
  Clock,
  Settings,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Sparkles,
  Stethoscope,
  X,
} from 'lucide-react';
import type { WorkspaceId, DemoNotice } from '../types';

interface SidebarProps {
  activeWorkspace: WorkspaceId;
  onSelectWorkspace: (id: WorkspaceId) => void;
  demoNotices: DemoNotice[];
  onSelectDemo: (demo: DemoNotice) => void;
  onResetWorkspace: () => void;
  hasLoadedNotice: boolean;
  historyCount: number;
  currentLanguage: string;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeWorkspace,
  onSelectWorkspace,
  demoNotices,
  onSelectDemo,
  onResetWorkspace,
  hasLoadedNotice,
  historyCount,
  currentLanguage,
  isMobileOpen,
  onCloseMobile,
}) => {
  const isHindi = currentLanguage === 'hi';
  const [selectedDemoId, setSelectedDemoId] = useState<string>('');
  const [diagnosticsExpanded, setDiagnosticsExpanded] = useState<boolean>(false);

  const handleNavClick = (id: WorkspaceId) => {
    onSelectWorkspace(id);
    onCloseMobile();
  };

  const handleLoadSelectedDemo = () => {
    if (!selectedDemoId && demoNotices.length > 0) {
      onSelectDemo(demoNotices[0]);
    } else {
      const demo = demoNotices.find((d) => d.id === selectedDemoId);
      if (demo) onSelectDemo(demo);
    }
    onCloseMobile();
  };

  const handleQuickDemoClick = () => {
    // Look for UPSC / Scholarship demo or first available
    const compDemo = demoNotices.find((d) => d.id.includes('scholarship') || d.id.includes('upsc')) || demoNotices[0];
    if (compDemo) {
      onSelectDemo(compDemo);
    }
    onCloseMobile();
  };

  const navItems = [
    {
      id: 'dashboard' as WorkspaceId,
      label: isHindi ? 'डैशबोर्ड' : 'Dashboard',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'ingestion' as WorkspaceId,
      label: isHindi ? '1. अंतर्ग्रहण और ओसीआर' : '1. Ingestion & OCR',
      icon: FileText,
      badge: null,
    },
    {
      id: 'facts' as WorkspaceId,
      label: isHindi ? '2. साक्ष्य-आधारित तथ्य' : '2. Grounded Facts',
      icon: Search,
      badge: hasLoadedNotice ? '6/6' : null,
      badgeType: 'neutral',
    },
    {
      id: 'summary_actions' as WorkspaceId,
      label: isHindi ? '3. सारांश और कार्य' : '3. Summary & Actions',
      icon: ListOrdered,
      badge: null,
    },
    {
      id: 'revision_ledger' as WorkspaceId,
      label: isHindi ? '4. संशोधन बही (रिवीजन)' : '4. Revision Ledger',
      icon: GitCompare,
      badge: 'DIFF',
      badgeType: 'accent',
    },
    {
      id: 'eligibility' as WorkspaceId,
      label: isHindi ? '5. पात्रता जांच' : '5. Eligibility Check',
      icon: UserCheck,
      badge: 'RULES',
      badgeType: 'slate',
    },
    {
      id: 'qa' as WorkspaceId,
      label: isHindi ? '6. अनुवर्ती प्रश्नोत्तर' : '6. Follow-Up Q&A',
      icon: MessageSquareText,
      badge: null,
    },
    {
      id: 'action_navigator' as WorkspaceId,
      label: isHindi ? '7. एक्शन नेविगेटर' : '7. Action Navigator',
      icon: Compass,
      badge: 'PLAN',
      badgeType: 'emerald',
    },
    {
      id: 'multi_notice_timeline' as WorkspaceId,
      label: isHindi ? '8. नोटिस समयरेखा' : '8. Multi-Notice Timeline',
      icon: History,
      badge: 'GRAPH',
      badgeType: 'teal',
    },
    {
      id: 'history' as WorkspaceId,
      label: isHindi ? 'नोटिस इतिहास' : 'Notice History',
      icon: Clock,
      badge: historyCount > 0 ? String(historyCount) : null,
      badgeType: 'count',
    },
    {
      id: 'settings_health' as WorkspaceId,
      label: isHindi ? 'सेटिंग्स और स्वास्थ्य' : 'Settings & Health',
      icon: Settings,
      badge: null,
    },
    {
      id: 'demo_notices' as WorkspaceId,
      label: isHindi ? 'डेमो परिपत्र पुस्तकालय' : 'Demo Notices',
      icon: Sparkles,
      badge: null,
    },
    {
      id: 'diagnostics' as WorkspaceId,
      label: isHindi ? 'प्रीफ्लाइट डायग्नोस्टिक्स' : 'Preflight Diagnostics',
      icon: Stethoscope,
      badge: null,
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="sidebar-backdrop"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside className={`app-sidebar ${isMobileOpen ? 'open' : ''}`} aria-label="Sidebar Navigation">
        {/* Mobile Close Button */}
        <div className="sidebar-mobile-header">
          <span className="sidebar-mobile-title">SuchnaSetu AI</span>
          <button
            type="button"
            className="btn-sidebar-close"
            onClick={onCloseMobile}
            aria-label="Close Sidebar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Section 1: Navigation Workspaces */}
        <div className="sidebar-section">
          <div className="sidebar-heading">
            {isHindi ? 'नेविगेशन (कार्यक्षेत्र)' : 'NAVIGATION'}
          </div>

          <nav className="sidebar-nav">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeWorkspace === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => handleNavClick(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  title={item.label}
                >
                  <Icon size={16} className="nav-item-icon" />
                  <span className="nav-item-label">{item.label}</span>
                  {item.badge && (
                    <span className={`nav-item-badge badge-${item.badgeType || 'neutral'}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Section 2: Demonstration Notices */}
        <div className="sidebar-section demo-notices-sidebar">
          <div className="sidebar-heading">
            {isHindi ? 'डेमो नोटिस (नमूने)' : 'DEMO NOTICES'}
          </div>

          <button
            type="button"
            className="btn-competition-demo"
            onClick={handleQuickDemoClick}
            title={isHindi ? 'त्वरित डेमो नोटिस लोड करें' : 'Load quick scholarship demonstration notice'}
          >
            <Sparkles size={14} className="quick-demo-icon" />
            <span>{isHindi ? '⚡ त्वरित डेमो (छात्रवृत्ति)' : '⚡ Competition Demo (UPSC)'}</span>
          </button>

          <div className="demo-select-group">
            <label htmlFor="sample-notices-select" className="demo-select-label">
              {isHindi ? 'नमूना नोटिस चुनें:' : 'Sample Notices:'}
            </label>
            <select
              id="sample-notices-select"
              className="demo-select"
              value={selectedDemoId}
              onChange={(e) => setSelectedDemoId(e.target.value)}
            >
              <option value="">{isHindi ? '-- नोटिस चुनें --' : 'State Post-Matric Circular'}</option>
              {demoNotices.map((d) => (
                <option key={d.id} value={d.id}>
                  {isHindi ? d.title_hi || d.title : d.title}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            className="btn-load-demo"
            onClick={handleLoadSelectedDemo}
            disabled={demoNotices.length === 0}
          >
            {isHindi ? 'चयनित नोटिस लोड करें' : 'Load Selected Notice'}
          </button>

          <button
            type="button"
            className="btn-reset-workspace"
            onClick={() => {
              onResetWorkspace();
              onCloseMobile();
            }}
          >
            <RotateCcw size={12} />
            <span>{isHindi ? 'कार्यक्षेत्र रीसेट करें' : 'Reset Workspace'}</span>
          </button>
        </div>

        {/* Section 3: Preflight Diagnostics Collapsible Drawer */}
        <div className="sidebar-footer-diagnostics">
          <button
            type="button"
            className="diagnostics-toggle-btn"
            onClick={() => {
              setDiagnosticsExpanded(!diagnosticsExpanded);
              onSelectWorkspace('diagnostics');
            }}
            aria-expanded={diagnosticsExpanded}
          >
            <div className="diagnostics-toggle-left">
              <Stethoscope size={15} className="diagnostics-icon" />
              <span>{isHindi ? 'प्रीफ्लाइट डायग्नोस्टिक्स' : 'Preflight Diagnostics'}</span>
            </div>
            {diagnosticsExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </aside>
    </>
  );
};
