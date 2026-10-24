import test from 'node:test';
import assert from 'node:assert/strict';
import {
  saveDocumentState,
  loadDocumentState,
  clearDocumentState,
  applyStoredStateToAnalysis,
  isValidStoredDocumentState,
  getStorageKey,
} from '../src/services/storage.ts';
import type { NoticeAnalysisResult } from '../src/types/index.ts';

// Mock in-memory localStorage for unit testing
function createMockStorage(): Storage {
  const store: Record<string, string> = {};
  return {
    getItem(key: string) {
      return store[key] ?? null;
    },
    setItem(key: string, value: string) {
      store[key] = String(value);
    },
    removeItem(key: string) {
      delete store[key];
    },
    clear() {
      for (const k of Object.keys(store)) {
        delete store[k];
      }
    },
    key(index: number) {
      return Object.keys(store)[index] ?? null;
    },
    get length() {
      return Object.keys(store).length;
    },
  };
}

const mockAnalysis: NoticeAnalysisResult = {
  document_id: 'doc_test_12345',
  language: 'en',
  reading_level: 'standard',
  notice_title: 'State Merit Scholarship 2026',
  summary: 'Eligible students can apply for merit scholarship by 15 Nov 2026.',
  fields: {
    purpose: {
      key: 'purpose',
      label: 'Purpose',
      value: 'Financial scholarship',
      status: 'found',
      evidence: ['financial assistance'],
      is_confirmed: false,
    },
    eligibility: {
      key: 'eligibility',
      label: 'Eligibility',
      value: '65% marks',
      status: 'found',
      evidence: ['at least 65% marks'],
      is_confirmed: false,
    },
    deadline: {
      key: 'deadline',
      label: 'Submission Deadline',
      value: '15/11/2026',
      status: 'needs_confirmation',
      evidence: ['15/11/2026'],
      uncertainty_reason: 'Non-standard slash format',
      is_confirmed: false,
    },
    required_documents: {
      key: 'required_documents',
      label: 'Required Documents',
      value: ['bonafide certificate', 'marksheet'],
      status: 'found',
      evidence: ['attach college bonafide'],
      is_confirmed: false,
    },
    contact: {
      key: 'contact',
      label: 'Contact Information',
      value: 'scholarship@up.gov.in',
      status: 'found',
      evidence: ['scholarship@up.gov.in'],
      is_confirmed: false,
    },
    action: {
      key: 'action',
      label: 'Required Action',
      value: 'Submit printed application form',
      status: 'found',
      evidence: ['submit printed form'],
      is_confirmed: false,
    },
  },
  checklist: [
    {
      id: 'step_1',
      step_number: 1,
      action: 'Obtain bonafide certificate',
      documents_needed: ['bonafide'],
      evidence: ['attach college bonafide'],
      requires_confirmation: false,
      completed: false,
    },
    {
      id: 'step_2',
      step_number: 2,
      action: 'Submit application before deadline',
      deadline: '15/11/2026',
      documents_needed: [],
      evidence: ['15/11/2026'],
      requires_confirmation: true,
      completed: false,
    },
  ],
  limitations: [],
  needs_user_confirmation: true,
  ocr_text: 'GOVERNMENT NOTICE...',
  ocr_confidence: 0.94,
  source_type: 'image',
  user_confirmations: {},
  model_used: 'google/gemma-4-31b-it',
  is_mock_inference: true,
  created_at: '2026-10-20T10:00:00Z',
};

test('1. saveDocumentState and loadDocumentState correctly store and retrieve checklist and field confirmation', () => {
  const storage = createMockStorage();
  const docId = 'doc_test_12345';

  const saved = saveDocumentState(
    docId,
    {
      completedChecklistIds: ['step_1'],
      fieldConfirmations: {
        deadline: {
          fieldKey: 'deadline',
          originalValue: '15/11/2026',
          confirmedValue: '15 November 2026, 5:00 PM',
          confirmedAt: '2026-10-20T12:00:00Z',
        },
      },
    },
    storage
  );

  assert.equal(saved, true);

  const loaded = loadDocumentState(docId, storage);
  assert.notEqual(loaded, null);
  assert.equal(loaded?.documentId, docId);
  assert.deepEqual(loaded?.completedChecklistIds, ['step_1']);
  assert.equal(loaded?.fieldConfirmations.deadline.confirmedValue, '15 November 2026, 5:00 PM');
  // Verifies original extracted value is preserved separately!
  assert.equal(loaded?.fieldConfirmations.deadline.originalValue, '15/11/2026');
});

test('2. saveDocumentState merges incremental updates without losing prior data', () => {
  const storage = createMockStorage();
  const docId = 'doc_test_12345';

  // Step 1: Save checklist progress
  saveDocumentState(docId, { completedChecklistIds: ['step_1'] }, storage);

  // Step 2: Later save field confirmation
  saveDocumentState(
    docId,
    {
      fieldConfirmations: {
        deadline: {
          fieldKey: 'deadline',
          originalValue: '15/11/2026',
          confirmedValue: '15 November 2026',
          confirmedAt: '2026-10-20T12:05:00Z',
        },
      },
    },
    storage
  );

  const loaded = loadDocumentState(docId, storage);
  assert.deepEqual(loaded?.completedChecklistIds, ['step_1']);
  assert.equal(loaded?.fieldConfirmations.deadline.confirmedValue, '15 November 2026');
});

test('3. loadDocumentState gracefully rejects malformed or invalid entries without throwing', () => {
  const storage = createMockStorage();
  const docId = 'doc_malformed';
  const key = getStorageKey(docId);

  // Corrupted non-JSON string
  storage.setItem(key, '{ invalid json !!');
  assert.equal(loadDocumentState(docId, storage), null);

  // Invalid schema: documentId mismatch
  storage.setItem(
    key,
    JSON.stringify({
      version: 1,
      documentId: 'doc_different_id',
      savedAt: '2026-10-20',
      completedChecklistIds: [],
      fieldConfirmations: {},
    })
  );
  assert.equal(loadDocumentState(docId, storage), null);

  // Invalid schema: completedChecklistIds is not an array
  storage.setItem(
    key,
    JSON.stringify({
      version: 1,
      documentId: docId,
      savedAt: '2026-10-20',
      completedChecklistIds: 'not-an-array',
      fieldConfirmations: {},
    })
  );
  assert.equal(loadDocumentState(docId, storage), null);
  // Corrupted entry is safely cleared from storage
  assert.equal(storage.getItem(key), null);
});

test('4. clearDocumentState removes the saved state for a specific document', () => {
  const storage = createMockStorage();
  const docId = 'doc_to_clear';

  saveDocumentState(docId, { completedChecklistIds: ['step_1'] }, storage);
  assert.notEqual(loadDocumentState(docId, storage), null);

  const cleared = clearDocumentState(docId, storage);
  assert.equal(cleared, true);
  assert.equal(loadDocumentState(docId, storage), null);
});

test('5. applyStoredStateToAnalysis restores checklist items and field confirmations into analysis', () => {
  const storage = createMockStorage();
  const docId = mockAnalysis.document_id;

  // Persist that step_1 is completed and deadline was confirmed
  saveDocumentState(
    docId,
    {
      completedChecklistIds: ['step_1'],
      fieldConfirmations: {
        deadline: {
          fieldKey: 'deadline',
          originalValue: '15/11/2026',
          confirmedValue: '15 November 2026, 5:00 PM',
          confirmedAt: '2026-10-20T12:00:00Z',
        },
      },
    },
    storage
  );

  const restored = applyStoredStateToAnalysis(mockAnalysis, storage);

  // Checklist verification
  assert.equal(restored.checklist[0].completed, true);
  assert.equal(restored.checklist[1].completed, false);

  // Field confirmation verification
  assert.equal(restored.fields.deadline.is_confirmed, true);
  assert.equal(restored.fields.deadline.user_confirmed_value, '15 November 2026, 5:00 PM');
  // Original value remains preserved in field.value
  assert.equal(restored.fields.deadline.value, '15/11/2026');
  assert.equal(restored.fields.deadline.status, 'found');

  // needs_user_confirmation recalculated to false since deadline was confirmed
  assert.equal(restored.needs_user_confirmation, false);
});

test('6. isValidStoredDocumentState correctly validates valid objects and rejects malformed inputs', () => {
  assert.equal(isValidStoredDocumentState(null), false);
  assert.equal(isValidStoredDocumentState('not an object'), false);
  assert.equal(isValidStoredDocumentState({}), false);

  const valid = {
    version: 1,
    documentId: 'doc_123',
    savedAt: '2026-10-20T10:00:00Z',
    completedChecklistIds: ['step_1'],
    fieldConfirmations: {},
  };
  assert.equal(isValidStoredDocumentState(valid), true);
  assert.equal(isValidStoredDocumentState(valid, 'doc_123'), true);
  assert.equal(isValidStoredDocumentState(valid, 'doc_different'), false);
});

test('7. Corrupted JSON in storage is handled without throwing and clears corrupted key', () => {
  const storage = createMockStorage();
  const docId = 'doc_corrupted_payload';
  const key = getStorageKey(docId);
  storage.setItem(key, '<<<CORRUPTED BINARY / NON-JSON DATA>>>');

  // Must not throw exception
  const state = loadDocumentState(docId, storage);
  assert.equal(state, null);
  // Corrupted key is pruned
  assert.equal(storage.getItem(key), null);
});

test('8. New analysis is completely isolated and not corrupted by existing stored documents', () => {
  const storage = createMockStorage();
  const docA = 'doc_notice_A';
  const docB = 'doc_notice_B';

  saveDocumentState(docA, { completedChecklistIds: ['step_1', 'step_2'] }, storage);

  // Analysis for docB should not inherit docA's completed checklist
  const analysisB: NoticeAnalysisResult = {
    ...mockAnalysis,
    document_id: docB,
  };

  const restoredB = applyStoredStateToAnalysis(analysisB, storage);
  assert.equal(restoredB.checklist[0].completed, false);
  assert.equal(restoredB.checklist[1].completed, false);
  assert.equal(restoredB.fields.deadline.is_confirmed, false);
});
