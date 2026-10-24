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

export interface HealthStatus {
  status: string;
  project: string;
  hindi_name: string;
  version: string;
  gemma_model: string;
  model_provider: string;
  ocr_ready: boolean;
  live_inference_available: boolean;
}

export interface ProviderInfo {
  id: string;
  name: string;
  available: boolean;
  model: string;
  is_current: boolean;
}

export interface NoticeRelationship {
  source_notice_id: string;
  target_notice_id: string;
  relationship_type: 'AMENDMENT' | 'EXTENSION' | 'CANCELLATION' | 'CORRIGENDUM' | 'ADDENDUM' | 'CLARIFICATION' | 'RELATED' | 'SUPERSEDED' | 'UNRESOLVED';
  confidence: string;
  is_explicit: boolean;
  evidence_quote: string;
  source_reference?: string;
  explanation: string;
}

export interface RevisionEntry {
  field_name: string;
  display_name: string;
  old_value: string;
  new_value: string;
  change_category: 'UNCHANGED' | 'MODIFIED' | 'ADDED' | 'REMOVED' | 'UNCERTAIN';
  old_evidence_quote?: string;
  new_evidence_quote?: string;
  requires_review: boolean;
  explanation: string;
}

export interface RevisionLedger {
  source_notice_id: string;
  target_notice_id: string;
  source_title: string;
  target_title: string;
  relationship: NoticeRelationship;
  entries: RevisionEntry[];
  summary_of_changes: string;
  created_at?: string;
}

export interface EligibilityCriterion {
  id: string;
  criterion_type: 'AGE' | 'PERCENTAGE' | 'QUALIFICATION' | 'CATEGORY' | 'RESIDENCY' | 'GENDER' | 'OTHER';
  description: string;
  operator: string;
  threshold_value: string;
  evidence_quote: string;
  category_relaxation?: Record<string, string>;
}

export interface CriterionEvaluationResult {
  criterion_id: string;
  criterion_type: string;
  description: string;
  status: 'PASS' | 'FAIL' | 'UNKNOWN' | 'NOT_APPLICABLE';
  applicant_value: string;
  requirement_value: string;
  evidence_quote: string;
  explanation: string;
  missing_info?: string;
}

export interface EligibilityAssessment {
  session_id?: string;
  overall_status: 'ELIGIBLE' | 'NOT_ELIGIBLE' | 'INCONCLUSIVE';
  results: CriterionEvaluationResult[];
  summary: string;
}

export interface ApplicantProfile {
  age?: number;
  percentage?: number;
  cgpa?: number;
  qualifications: string[];
  category?: string;
  gender?: string;
  residency?: string;
  notes?: string;
}

export type WorkspaceId =
  | 'dashboard'
  | 'ingestion'
  | 'facts'
  | 'summary_actions'
  | 'revision_ledger'
  | 'eligibility'
  | 'qa'
  | 'action_navigator'
  | 'multi_notice_timeline'
  | 'history'
  | 'settings_health'
  | 'demo_notices'
  | 'diagnostics'
  | 'home';

export interface StoredNoticeSummary {
  documentId: string;
  noticeTitle: string;
  savedAt: string;
  sourceType: string;
  deadline?: string;
  groundedFieldsCount: number;
  ocrConfidence?: number;
  modelUsed?: string;
  rawText?: string;
}

export interface ProviderInfo {
  id: string;
  name: string;
  available: boolean;
  model: string;
  is_current: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  is_verified: boolean;
  created_at: string;
}

export type AuthPageView = 'login' | 'signup' | 'verify_email' | 'forgot_password' | 'reset_password';

export interface AuthNavOptions {
  email?: string;
  message?: string;
}

