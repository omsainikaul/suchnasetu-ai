import { test } from 'node:test';
import assert from 'node:assert';
import {
  getNoticeHistory,
  saveNoticeToHistory,
  deleteNoticeFromHistory,
  clearAllNoticeHistory,
} from '../src/services/storage.ts';
import type { NoticeAnalysisResult } from '../src/types/index.ts';

class MockStorage implements Storage {
  private store: Map<string, string> = new Map();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  key(index: number): string | null {
    const keys = Array.from(this.store.keys());
    return keys[index] || null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
}

const createMockNotice = (docId: string, title: string): NoticeAnalysisResult => ({
  document_id: docId,
  notice_title: title,
  authority_name: 'Department of Higher Education',
  language: 'en',
  reading_level: 'standard',
  ocr_text: 'Sample circular text for scholarship application.',
  ocr_confidence: 0.95,
  source_type: 'pasted_text',
  fields: {},
  summary: {
    core_purpose: 'Purpose text',
    who_is_affected: 'Students',
    critical_deadlines: '30-Nov-2026',
    immediate_actions: ['Submit form'],
    consequences_of_inaction: 'Disqualification',
    authority_contact: 'contact@gov.in',
  },
  checklist: [],
  processing_time_ms: 120,
  needs_user_confirmation: false,
});

test('1. Anonymous notice history uses default namespace', () => {
  const storage = new MockStorage();
  const notice1 = createMockNotice('doc_anon_1', 'Anon Circular 1');

  saveNoticeToHistory(notice1, undefined, storage);
  const items = getNoticeHistory(undefined, storage);
  assert.strictEqual(items.length, 1);
  assert.strictEqual(items[0].documentId, 'doc_anon_1');
  assert.strictEqual(items[0].noticeTitle, 'Anon Circular 1');
  assert.ok(storage.getItem('suchnasetu_history_index'));
});

test('2. Per-user history namespacing isolates notices between users', () => {
  const storage = new MockStorage();
  const user1Notice = createMockNotice('doc_u1_1', 'Citizen A Circular');
  const user2Notice = createMockNotice('doc_u2_1', 'Citizen B Circular');

  saveNoticeToHistory(user1Notice, 'user_citizen_1', storage);
  saveNoticeToHistory(user2Notice, 'user_citizen_2', storage);

  // User 1 sees only their circular
  const user1Items = getNoticeHistory('user_citizen_1', storage);
  assert.strictEqual(user1Items.length, 1);
  assert.strictEqual(user1Items[0].documentId, 'doc_u1_1');
  assert.strictEqual(user1Items[0].noticeTitle, 'Citizen A Circular');

  // User 2 sees only their circular
  const user2Items = getNoticeHistory('user_citizen_2', storage);
  assert.strictEqual(user2Items.length, 1);
  assert.strictEqual(user2Items[0].documentId, 'doc_u2_1');
  assert.strictEqual(user2Items[0].noticeTitle, 'Citizen B Circular');

  // Storage contains namespaced keys
  assert.ok(storage.getItem('suchnasetu_u_user_citizen_1_history_index'));
  assert.ok(storage.getItem('suchnasetu_u_user_citizen_2_history_index'));
});

test('3. Deleting notice removes only target user entry', () => {
  const storage = new MockStorage();
  const noticeA1 = createMockNotice('doc_a1', 'Notice A1');
  const noticeA2 = createMockNotice('doc_a2', 'Notice A2');
  const noticeB1 = createMockNotice('doc_b1', 'Notice B1');

  saveNoticeToHistory(noticeA1, 'user_a', storage);
  saveNoticeToHistory(noticeA2, 'user_a', storage);
  saveNoticeToHistory(noticeB1, 'user_b', storage);

  assert.strictEqual(getNoticeHistory('user_a', storage).length, 2);
  assert.strictEqual(getNoticeHistory('user_b', storage).length, 1);

  deleteNoticeFromHistory('doc_a1', 'user_a', storage);

  // User A now has 1 notice (doc_a2)
  const userAItems = getNoticeHistory('user_a', storage);
  assert.strictEqual(userAItems.length, 1);
  assert.strictEqual(userAItems[0].documentId, 'doc_a2');

  // User B still has 1 notice (doc_b1)
  const userBItems = getNoticeHistory('user_b', storage);
  assert.strictEqual(userBItems.length, 1);
  assert.strictEqual(userBItems[0].documentId, 'doc_b1');
});

test('4. clearAllNoticeHistory clears only the target user history', () => {
  const storage = new MockStorage();
  saveNoticeToHistory(createMockNotice('doc_u1', 'Notice 1'), 'user_1', storage);
  saveNoticeToHistory(createMockNotice('doc_u2', 'Notice 2'), 'user_2', storage);

  clearAllNoticeHistory('user_1', storage);

  assert.strictEqual(getNoticeHistory('user_1', storage).length, 0);
  assert.strictEqual(getNoticeHistory('user_2', storage).length, 1);
});
