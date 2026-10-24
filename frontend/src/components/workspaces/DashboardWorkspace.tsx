import React from 'react';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Calendar,
  CheckCircle2,
  FileText,
  Compass,
  UserCheck,
  GitCompare,
  Upload,
  Layers,
} from 'lucide-react';
import type { NoticeAnalysisResult, WorkspaceId } from '../../types';

interface DashboardWorkspaceProps {
  currentLanguage: string;
  result: NoticeAnalysisResult | null;
  onNavigateWorkspace: (id: WorkspaceId) => void;
  onLoadQuickDemo: () => void;
  onScrollToInput: () => void;
}

export const DashboardWorkspace: React.FC<DashboardWorkspaceProps> = ({
  currentLanguage,
  result,
  onNavigateWorkspace,
  onLoadQuickDemo,
  onScrollToInput,
}) => {
  const isHindi = currentLanguage === 'hi';

  const completedCount = result?.checklist
    ? result.checklist.filter((i) => i.completed).length
    : 0;
  const totalCount = result?.checklist?.length || 0;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const groundedFieldsCount = result?.fields
    ? Object.values(result.fields).filter((f) => f && f.status === 'found').length
    : 0;

  const deadlineValue = result?.fields?.deadline?.value
    ? Array.isArray(result.fields.deadline.value)
      ? result.fields.deadline.value.join(', ')
      : String(result.fields.deadline.value)
    : null;

  return (
    <div className="dashboard-workspace-container">
      {/* 1. Hero Notice Intelligence Banner (As in Reference Screenshot 1) */}
      <section className="dashboard-hero-card" aria-label="Dashboard Overview">
        <div className="hero-content-col">
          <div className="hero-kicker-tag">
            <span className="kicker-dot" />
            <span>{isHindi ? 'सभी नागरिकों के लिए सूचना सुगमता' : 'NOTICE INTELLIGENCE FOR EVERYONE'}</span>
          </div>

          <h1 className="dashboard-hero-title">
            {isHindi ? (
              <>
                जटिल सरकारी परिपत्रों से <br className="hero-headline-break" />
                <span className="text-emerald-700">स्पष्ट कार्य योजना।</span>
              </>
            ) : (
              <>
                From complex notices <br className="hero-headline-break" />
                to <span className="text-emerald-700">clear next steps.</span>
              </>
            )}
          </h1>

          <p className="dashboard-hero-subtitle">
            {isHindi
              ? 'कठिन सरकारी परिपत्रों, छात्रवृत्ति अधिसूचनाओं, भर्ती विज्ञापनों और कानूनी सूचनाओं को साक्ष्य-आधारित तथ्यों, सरल भाषा सारांश और चरणबद्ध व्यक्तिगत चेकलिस्ट में बदलें।'
              : 'Transform convoluted government circulars, scholarships, public notifications, and legal summonses into source-grounded facts, plain-language summaries, and actionable personal checklists.'}
          </p>

          <div className="dashboard-hero-actions">
            <button
              type="button"
              className="btn-hero-primary"
              onClick={() => {
                if (onScrollToInput) onScrollToInput();
                onNavigateWorkspace('ingestion');
              }}
            >
              <Upload size={16} />
              <span>{isHindi ? 'नोटिस का विश्लेषण करें' : 'Analyze a Notice'}</span>
            </button>

            <button
              type="button"
              className="btn-hero-secondary"
              onClick={onLoadQuickDemo}
            >
              <Sparkles size={16} className="text-emerald-700" />
              <span>{isHindi ? 'डेमो नोटिस देखें' : 'Explore Demo Notice'}</span>
            </button>
          </div>

          <div className="hero-trust-row">
            <div className="trust-item">
              <CheckCircle2 size={15} className="text-emerald-700" />
              <span>{isHindi ? 'साक्ष्य-आधारित उद्धरण' : 'Source-Backed Facts'}</span>
            </div>
            <div className="trust-item">
              <ShieldCheck size={15} className="text-emerald-700" />
              <span>{isHindi ? 'पारदर्शी अनिश्चितता' : 'Transparent Uncertainty'}</span>
            </div>
            <div className="trust-item">
              <Layers size={15} className="text-emerald-700" />
              <span>{isHindi ? 'द्विभाषी मार्गदर्शन (EN/HI)' : 'Accessible Guidance'}</span>
            </div>
          </div>
        </div>

        {/* Right Preview Card: Matches Reference Screenshot Preview Card */}
        <div className="hero-preview-col">
          <div className="hero-preview-card">
            <div className="preview-card-header">
              <div className="traffic-lights">
                <span className="light light-red" />
                <span className="light light-yellow" />
                <span className="light light-green" />
              </div>
              <span className="preview-label">
                {result ? (isHindi ? 'सक्रिय नोटिस पूर्वावलोकन' : 'Active Notice Overview') : (isHindi ? 'नोटिस इंटेलिजेंस पूर्वावलोकन' : 'Notice Intelligence Preview')}
              </span>
              <span className="synthetic-badge">
                {result?.is_mock_inference ? 'DETERMINISTIC EVAL' : result ? 'LIVE ANALYSIS' : 'SYNTHETIC DEMONSTRATION DATA'}
              </span>
            </div>

            <div className="preview-card-body">
              <span className="preview-meta-kicker">
                {result ? result.document_id : 'NATIONAL MERIT SCHOLARSHIP 2026'}
              </span>
              <h3 className="preview-doc-title">
                {result ? result.notice_title : 'Department of Higher Education Circular #NMS-2026/88'}
              </h3>

              <div className="preview-field-box">
                <div className="field-box-header">
                  <span className="field-box-title">{isHindi ? 'अंतिम तिथि' : 'Closing Deadline'}</span>
                  <span className="stated-verified-pill">
                    {result?.fields?.deadline?.status === 'needs_confirmation'
                      ? (isHindi ? '⚠ समीक्षा आवश्यक' : 'Needs Confirmation')
                      : (isHindi ? 'उल्लिखित (सत्यापित)' : 'Stated (Verified)')}
                  </span>
                </div>
                <div className="field-box-val">
                  {deadlineValue || '31 October 2026, 5:00 PM IST'}
                </div>
                <blockquote className="preview-excerpt">
                  "{result?.fields?.deadline?.evidence?.[0] || 'Last date for submission is 31st October 2026 up to 17:00 hrs.'}"
                </blockquote>
              </div>

              <div className="preview-checklist-mini">
                <div className="mini-checklist-header">
                  <span>{isHindi ? 'कार्य योजना पूर्वावलोकन' : 'Action Plan Preview'}</span>
                  <span className="step-count-pill">
                    {totalCount > 0 ? `Step 1 of ${totalCount}` : 'Step 1 of 4'}
                  </span>
                </div>
                <div className="mini-step-item">
                  <CheckCircle2 size={14} className="text-emerald-700" />
                  <span>
                    {result?.checklist?.[0]?.action || 'Obtain Family Income Certificate (< ₹2.5 Lakhs)'}
                  </span>
                </div>
              </div>

              <p className="preview-footer-note">
                {result
                  ? (isHindi ? 'वर्तमान में लोड किए गए परिपत्र का प्रत्यक्ष विश्लेषण।' : 'Real-time analysis derived from currently loaded circular.')
                  : (isHindi ? 'मानक PS 02 छात्रवृत्ति बेंचमार्क नोटिस पर आधारित प्रदर्शन आउटपुट।' : 'Demonstration output based on standard PS02 scholarship benchmark notice.')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Active Notice Intelligence Metrics (When a Notice is Loaded) */}
      {result && (
        <section className="dashboard-loaded-metrics-section" aria-label="Loaded Circular Status">
          <div className="section-title-bar">
            <div className="title-left">
              <FileText size={18} className="text-emerald-700" />
              <h2 className="section-title">
                {isHindi ? 'सक्रिय परिपत्र विश्लेषण अवलोकन' : 'Current Notice Extraction Overview'}
              </h2>
            </div>
            <span className="doc-id-pill">ID: {result.document_id}</span>
          </div>

          <div className="dashboard-metrics-grid">
            {/* Metric 1: Grounded Facts */}
            <div
              className="metric-card clickable"
              onClick={() => onNavigateWorkspace('facts')}
              role="button"
              tabIndex={0}
            >
              <div className="metric-icon-wrap bg-emerald-50 text-emerald-700">
                <ShieldCheck size={20} />
              </div>
              <div className="metric-info">
                <span className="metric-label">{isHindi ? 'साक्ष्य-पुष्ट तथ्य' : 'Grounded Facts'}</span>
                <div className="metric-val">
                  <span>{groundedFieldsCount} / 6</span>
                  <span className="metric-sub">{isHindi ? 'क्षेत्र सत्यापित' : 'Fields Verified'}</span>
                </div>
              </div>
              <ArrowRight size={16} className="metric-arrow" />
            </div>

            {/* Metric 2: Submission Deadline */}
            <div
              className="metric-card clickable"
              onClick={() => onNavigateWorkspace('action_navigator')}
              role="button"
              tabIndex={0}
            >
              <div className="metric-icon-wrap bg-amber-50 text-amber-700">
                <Calendar size={20} />
              </div>
              <div className="metric-info">
                <span className="metric-label">{isHindi ? 'अंतिम तिथि' : 'Next Deadline'}</span>
                <div className="metric-val text-truncate" title={deadlineValue || 'Not stated'}>
                  {deadlineValue || (isHindi ? 'उल्लिखित नहीं' : 'Not stated')}
                </div>
              </div>
              <ArrowRight size={16} className="metric-arrow" />
            </div>

            {/* Metric 3: Action Checklist Progress */}
            <div
              className="metric-card clickable"
              onClick={() => onNavigateWorkspace('summary_actions')}
              role="button"
              tabIndex={0}
            >
              <div className="metric-icon-wrap bg-teal-50 text-teal-700">
                <Compass size={20} />
              </div>
              <div className="metric-info">
                <span className="metric-label">{isHindi ? 'कार्य योजना प्रगति' : 'Action Steps'}</span>
                <div className="metric-val">
                  <span>{completedCount} / {totalCount}</span>
                  <span className="metric-sub">{progressPercent}% {isHindi ? 'पूर्ण' : 'Done'}</span>
                </div>
              </div>
              <ArrowRight size={16} className="metric-arrow" />
            </div>

            {/* Metric 4: Eligibility Check */}
            <div
              className="metric-card clickable"
              onClick={() => onNavigateWorkspace('eligibility')}
              role="button"
              tabIndex={0}
            >
              <div className="metric-icon-wrap bg-indigo-50 text-indigo-700">
                <UserCheck size={20} />
              </div>
              <div className="metric-info">
                <span className="metric-label">{isHindi ? 'पात्रता जांच' : 'Eligibility Check'}</span>
                <div className="metric-val">
                  <span className="text-emerald-700">{isHindi ? 'नियम तैयार' : 'Rules Ready'}</span>
                  <span className="metric-sub">{isHindi ? 'प्रोफ़ाइल जांचें' : 'Evaluate'}</span>
                </div>
              </div>
              <ArrowRight size={16} className="metric-arrow" />
            </div>
          </div>
        </section>
      )}

      {/* 3. Quick Action Workspaces Links */}
      <section className="dashboard-workspaces-grid-section">
        <h2 className="section-title">
          {isHindi ? 'त्वरित कार्यक्षेत्र नेविगेशन' : 'Direct Workspace Shortcuts'}
        </h2>

        <div className="workspaces-shortcuts-grid">
          <div
            className="shortcut-card"
            onClick={() => onNavigateWorkspace('ingestion')}
            role="button"
            tabIndex={0}
          >
            <div className="shortcut-icon-circle bg-emerald-100 text-emerald-800">
              <FileText size={18} />
            </div>
            <div className="shortcut-details">
              <h4>{isHindi ? '1. अंतर्ग्रहण और ओसीआर' : '1. Ingestion & OCR'}</h4>
              <p>{isHindi ? 'पीडीएफ, तस्वीरें या पाठ अपलोड करें' : 'Upload PDFs, photos, or raw notice text'}</p>
            </div>
          </div>

          <div
            className="shortcut-card"
            onClick={() => onNavigateWorkspace('facts')}
            role="button"
            tabIndex={0}
          >
            <div className="shortcut-icon-circle bg-teal-100 text-teal-800">
              <ShieldCheck size={18} />
            </div>
            <div className="shortcut-details">
              <h4>{isHindi ? '2. साक्ष्य-आधारित तथ्य' : '2. Grounded Facts'}</h4>
              <p>{isHindi ? '6 प्रमुख श्रेणियां और मूल पाठ साक्ष्य' : '6 mandatory PS02 fields & citations'}</p>
            </div>
          </div>

          <div
            className="shortcut-card"
            onClick={() => onNavigateWorkspace('summary_actions')}
            role="button"
            tabIndex={0}
          >
            <div className="shortcut-icon-circle bg-emerald-100 text-emerald-800">
              <CheckCircle2 size={18} />
            </div>
            <div className="shortcut-details">
              <h4>{isHindi ? '3. सारांश और कार्य' : '3. Summary & Actions'}</h4>
              <p>{isHindi ? 'सरल भाषा सारांश और एक्शन स्लिप' : 'Plain language summary & citizen slip'}</p>
            </div>
          </div>

          <div
            className="shortcut-card"
            onClick={() => onNavigateWorkspace('revision_ledger')}
            role="button"
            tabIndex={0}
          >
            <div className="shortcut-icon-circle bg-amber-100 text-amber-800">
              <GitCompare size={18} />
            </div>
            <div className="shortcut-details">
              <h4>{isHindi ? '4. संशोधन बही (रिवीजन)' : '4. Revision Ledger'}</h4>
              <p>{isHindi ? 'शुद्धिपत्र और मूल नोटिस में बदलाव देखें' : 'Compare corrigenda & track amendments'}</p>
            </div>
          </div>

          <div
            className="shortcut-card"
            onClick={() => onNavigateWorkspace('eligibility')}
            role="button"
            tabIndex={0}
          >
            <div className="shortcut-icon-circle bg-indigo-100 text-indigo-800">
              <UserCheck size={18} />
            </div>
            <div className="shortcut-details">
              <h4>{isHindi ? '5. पात्रता जांच' : '5. Eligibility Check'}</h4>
              <p>{isHindi ? 'उम्र, अंक, डिग्री व श्रेणी छूट जांचें' : 'Evaluate candidate rules & relaxations'}</p>
            </div>
          </div>

          <div
            className="shortcut-card"
            onClick={() => onNavigateWorkspace('action_navigator')}
            role="button"
            tabIndex={0}
          >
            <div className="shortcut-icon-circle bg-emerald-100 text-emerald-800">
              <Compass size={18} />
            </div>
            <div className="shortcut-details">
              <h4>{isHindi ? '7. एक्शन नेविगेटर' : '7. Action Navigator'}</h4>
              <p>{isHindi ? 'समय सीमा के आधार पर प्राथमिकता' : 'Interactive deadline-driven roadmap'}</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
