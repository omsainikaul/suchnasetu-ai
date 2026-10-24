import type { NoticeAnalysisResult, DemoNotice, AskResponse, SystemConfig, HealthStatus, UserProfile } from '../types';

const API_BASE = '/api';

export async function fetchHealth(): Promise<HealthStatus> {
  const resp = await fetch(`${API_BASE}/health`);
  if (!resp.ok) {
    throw new Error('Failed to load system health');
  }
  return resp.json();
}

export async function fetchSystemConfig(): Promise<SystemConfig> {
  const resp = await fetch(`${API_BASE}/config`);
  if (!resp.ok) {
    throw new Error('Failed to load system configuration');
  }
  return resp.json();
}

export async function fetchDemoNotices(): Promise<DemoNotice[]> {
  const resp = await fetch(`${API_BASE}/demo-notices`);
  if (!resp.ok) {
    throw new Error('Failed to load demo notices');
  }
  return resp.json();
}

export async function analyzeNotice(params: {
  file?: File | null;
  text?: string;
  language: string;
  readingLevel: string;
}): Promise<NoticeAnalysisResult> {
  const formData = new FormData();
  if (params.file) {
    formData.append('file', params.file);
  }
  if (params.text) {
    formData.append('text', params.text);
  }
  formData.append('language', params.language);
  formData.append('reading_level', params.readingLevel);

  const resp = await fetch(`${API_BASE}/analyze`, {
    method: 'POST',
    body: formData,
  });

  if (!resp.ok) {
    const errorData = await resp.json().catch(() => ({ detail: 'Analysis failed' }));
    throw new Error(errorData.detail || `Server error: ${resp.status}`);
  }

  return resp.json();
}

export async function askQuestion(params: {
  documentId: string;
  question: string;
  language: string;
}): Promise<AskResponse> {
  const resp = await fetch(`${API_BASE}/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      document_id: params.documentId,
      question: params.question,
      language: params.language,
    }),
  });

  if (!resp.ok) {
    const errorData = await resp.json().catch(() => ({ detail: 'Failed to answer question' }));
    throw new Error(errorData.detail || `Server error: ${resp.status}`);
  }

  return resp.json();
}

export async function confirmField(params: {
  documentId: string;
  fieldKey: string;
  confirmedValue: string;
}): Promise<{ status: string; message: string; original_value: any; confirmed_value: string }> {
  const resp = await fetch(`${API_BASE}/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      document_id: params.documentId,
      field_key: params.fieldKey,
      confirmed_value: params.confirmedValue,
    }),
  });

  if (!resp.ok) {
    const errorData = await resp.json().catch(() => ({ detail: 'Confirmation failed' }));
    throw new Error(errorData.detail || `Server error: ${resp.status}`);
  }

  return resp.json();
}

export async function fetchDocumentSession(documentId: string): Promise<NoticeAnalysisResult> {
  const resp = await fetch(`${API_BASE}/document/${encodeURIComponent(documentId)}`);
  if (!resp.ok) {
    throw new Error(`Failed to load document session: ${resp.status}`);
  }
  return resp.json();
}

export async function fetchProviders(): Promise<any[]> {
  const resp = await fetch(`${API_BASE}/providers`);
  if (!resp.ok) {
    throw new Error('Failed to load model providers');
  }
  return resp.json();
}

export async function selectProvider(providerId: string): Promise<any> {
  const resp = await fetch(`${API_BASE}/providers/select`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider: providerId }),
  });
  if (!resp.ok) {
    throw new Error('Failed to select provider');
  }
  return resp.json();
}

export async function compareRevisions(params: {
  sourceText: string;
  targetText: string;
  sourceTitle?: string;
  targetTitle?: string;
}): Promise<any> {
  const resp = await fetch(`${API_BASE}/revision-ledger/compare`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      source_text: params.sourceText,
      target_text: params.targetText,
      source_title: params.sourceTitle || 'Original Notice',
      target_title: params.targetTitle || 'Revised Notice / Corrigendum',
    }),
  });
  if (!resp.ok) {
    const errorData = await resp.json().catch(() => ({ detail: 'Comparison failed' }));
    throw new Error(errorData.detail || `Server error: ${resp.status}`);
  }
  return resp.json();
}

export async function extractEligibilityCriteria(noticeText: string, documentId?: string): Promise<any[]> {
  const resp = await fetch(`${API_BASE}/eligibility/extract-criteria`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notice_text: noticeText, document_id: documentId }),
  });
  if (!resp.ok) {
    throw new Error('Failed to extract eligibility criteria');
  }
  return resp.json();
}

export async function evaluateEligibility(params: {
  noticeText?: string;
  documentId?: string;
  profile: any;
}): Promise<any> {
  const resp = await fetch(`${API_BASE}/eligibility/evaluate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      notice_text: params.noticeText,
      document_id: params.documentId,
      profile: params.profile,
    }),
  });
  if (!resp.ok) {
    const errorData = await resp.json().catch(() => ({ detail: 'Evaluation failed' }));
    throw new Error(errorData.detail || `Server error: ${resp.status}`);
  }
  return resp.json();
}

export async function exportCalendarIcs(params: {
  title: string;
  deadline: string;
  action?: string;
  documentId?: string;
}): Promise<void> {
  const resp = await fetch(`${API_BASE}/export/ics`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: params.title,
      deadline: params.deadline,
      action: params.action,
      document_id: params.documentId,
    }),
  });
  if (!resp.ok) {
    throw new Error('Failed to generate calendar invitation');
  }
  const blob = await resp.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'notice_deadline.ics';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

export async function exportMarkdown(params: {
  title: string;
  summary: string;
  fields?: any;
  checklist?: any;
}): Promise<void> {
  const resp = await fetch(`${API_BASE}/export/markdown`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: params.title,
      summary: params.summary,
      fields: params.fields,
      checklist: params.checklist,
    }),
  });
  if (!resp.ok) {
    throw new Error('Failed to generate Markdown report');
  }
  const blob = await resp.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'suchnasetu_action_dossier.md';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

export async function detectRelationships(params: {
  sourceText: string;
  targetText: string;
}): Promise<any> {
  const resp = await fetch(`${API_BASE}/relationships/detect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      source_text: params.sourceText,
      target_text: params.targetText,
    }),
  });
  if (!resp.ok) {
    throw new Error('Failed to detect relationship between notices');
  }
  return resp.json();
}

export async function verifyEvidence(params: {
  sourceText: string;
  excerpt: string;
}): Promise<any> {
  const resp = await fetch(`${API_BASE}/trust/verify-evidence`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      source_text: params.sourceText,
      excerpt: params.excerpt,
    }),
  });
  if (!resp.ok) {
    throw new Error('Failed to verify trust evidence');
  }
  return resp.json();
}

export async function loadDemoNoticeById(demoId: string): Promise<DemoNotice> {
  const resp = await fetch(`${API_BASE}/demo-library/${encodeURIComponent(demoId)}/load`, {
    method: 'POST',
    credentials: 'same-origin',
  });
  if (!resp.ok) {
    throw new Error('Failed to load demo notice from library');
  }
  return resp.json();
}

// -----------------------------------------------------------------------------
// Authentication & Account API Functions
// -----------------------------------------------------------------------------

export async function fetchAuthMe(): Promise<UserProfile | null> {
  try {
    const resp = await fetch(`${API_BASE}/auth/me`, {
      method: 'GET',
      credentials: 'same-origin',
    });
    if (resp.status === 401) {
      return null;
    }
    if (!resp.ok) {
      return null;
    }
    return resp.json();
  } catch {
    return null;
  }
}

export async function registerAccount(params: {
  name: string;
  email: string;
  password: string;
  confirmPassword?: string;
}): Promise<{ status: string; message: string; email_delivered?: boolean; already_verified?: boolean }> {
  const resp = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({
      name: params.name,
      email: params.email,
      password: params.password,
      confirm_password: params.confirmPassword,
    }),
  });

  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    throw new Error(data.detail || data.message || 'Registration failed.');
  }
  return data;
}

export async function loginAccount(params: {
  email: string;
  password: string;
  rememberMe?: boolean;
}): Promise<{ status: string; message: string; user?: UserProfile }> {
  const resp = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({
      email: params.email,
      password: params.password,
      remember_me: !!params.rememberMe,
    }),
  });

  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    throw new Error(data.detail || data.message || 'Invalid email or password.');
  }
  return data;
}

export async function verifyEmailAddress(params: {
  token?: string;
  email?: string;
  code?: string;
}): Promise<{ status: string; message: string }> {
  const resp = await fetch(`${API_BASE}/auth/verify-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({
      token: params.token || undefined,
      email: params.email || undefined,
      code: params.code || undefined,
    }),
  });

  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    throw new Error(data.detail || data.message || 'Email verification failed.');
  }
  return data;
}

export async function resendEmailVerification(email: string): Promise<{ status: string; message: string; email_delivered?: boolean; already_verified?: boolean }> {
  const resp = await fetch(`${API_BASE}/auth/resend-verification`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ email }),
  });

  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    throw new Error(data.detail || data.message || 'Failed to resend verification email.');
  }
  return data;
}

export async function logoutAccount(): Promise<void> {
  try {
    await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      credentials: 'same-origin',
    });
  } catch (err) {
    console.warn('Logout network notice:', err);
  }
}

export async function requestPasswordReset(params: {
  email: string;
  method?: 'link' | 'code';
}): Promise<{ status: string; message: string }> {
  const resp = await fetch(`${API_BASE}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({
      email: params.email,
      method: params.method || 'link',
    }),
  });

  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    throw new Error(data.detail || data.message || 'Password reset request failed.');
  }
  return data;
}

export async function completePasswordReset(params: {
  newPassword: string;
  confirmPassword?: string;
  token?: string;
  email?: string;
  code?: string;
}): Promise<{ status: string; message: string }> {
  const resp = await fetch(`${API_BASE}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({
      new_password: params.newPassword,
      confirm_password: params.confirmPassword,
      token: params.token || undefined,
      email: params.email || undefined,
      code: params.code || undefined,
    }),
  });

  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    throw new Error(data.detail || data.message || 'Password reset failed.');
  }
  return data;
}
