export type FieldStatus = 'found' | 'not_stated' | 'needs_confirmation' | 'failed';

export interface StructuredField {
  key: string;
  label: string;
  label_hi?: string;
  value: string | string[];
  status: FieldStatus;
  evidence: string[];
  confidence?: number;
  user_confirmed_value?: string;
  is_confirmed: boolean;
  uncertainty_reason?: string;
}

export interface ChecklistItem {
  id: string;
  step_number: number;
  action: string;
  deadline?: string;
  documents_needed: string[];
  evidence: string[];
  requires_confirmation: boolean;
  completed: boolean;
}

export interface NoticeAnalysisResult {
  document_id: string;
  language: string;
  reading_level: string;
  notice_title: string;
  summary: string;
  fields: {
    purpose: StructuredField;
    eligibility: StructuredField;
    deadline: StructuredField;
    required_documents: StructuredField;
    contact: StructuredField;
    action: StructuredField;
    [key: string]: StructuredField;
  };
  checklist: ChecklistItem[];
  limitations: string[];
  needs_user_confirmation: boolean;
  ocr_text: string;
  ocr_confidence: number;
  source_type: string;
  user_confirmations: Record<string, {
    field_key: string;
    original_value: string | string[];
    confirmed_value: string;
    confirmed_at: string;
  }>;
  model_used: string;
  is_mock_inference: boolean;
  created_at: string;
}

export interface DemoNotice {
  id: string;
  title: string;
  title_hi: string;
  category: string;
  description: string;
  description_hi: string;
  sample_text: string;
  has_missing_field: boolean;
  missing_field_name?: string;
  has_uncertain_field: boolean;
  uncertain_field_name?: string;
}

export interface AskResponse {
  document_id: string;
  question: string;
  answer: string;
  status: string;
  evidence: string[];
  is_stated_in_notice: boolean;
  language: string;
}

export interface SystemConfig {
  project_name: string;
  hindi_name: string;
  gemma_model: string;
  provider: string;
  live_inference: boolean;
  supported_languages: Array<{ code: string; name: string }>;
  reading_levels: Array<{ code: string; label: string; label_hi: string }>;
  max_upload_size_mb: number;
}
