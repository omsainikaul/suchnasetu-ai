import type { NoticeAnalysisResult, DemoNotice, AskResponse, SystemConfig } from '../types';

const API_BASE = '/api';

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
