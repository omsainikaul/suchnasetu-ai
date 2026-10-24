import type { NoticeAnalysisResult } from '../types';

export const STORAGE_PREFIX = 'suchnasetu_doc_';
export const CURRENT_STORAGE_VERSION = 1;

export interface StoredFieldConfirmation {
  fieldKey: string;
  originalValue: string | string[];
  confirmedValue: string;
  confirmedAt: string;
}

export interface StoredDocumentState {
  version: number;
  documentId: string;
  savedAt: string;
  completedChecklistIds: string[];
  fieldConfirmations: Record<string, StoredFieldConfirmation>;
}

/**
 * Validates whether an unknown parsed object matches the StoredDocumentState shape.
 */
export function isValidStoredDocumentState(data: unknown, expectedDocId?: string): data is StoredDocumentState {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;

  if (typeof obj.documentId !== 'string' || !obj.documentId.trim()) return false;
  if (expectedDocId && obj.documentId !== expectedDocId) return false;
  if (typeof obj.version !== 'number' || obj.version < 1) return false;
  if (typeof obj.savedAt !== 'string') return false;
  if (!Array.isArray(obj.completedChecklistIds)) return false;
  if (!obj.completedChecklistIds.every((id) => typeof id === 'string' || typeof id === 'number')) return false;
  if (!obj.fieldConfirmations || typeof obj.fieldConfirmations !== 'object' || Array.isArray(obj.fieldConfirmations)) return false;

  return true;
}

/**
 * Returns the storage key for a given documentId.
 */
export function getStorageKey(documentId: string): string {
  return `${STORAGE_PREFIX}${documentId.trim()}`;
}

/**
 * Saves or updates checklist completions and/or field confirmations for a documentId.
 * Merges with existing state to prevent overwriting prior changes.
 * Avoids storing entire notices or personal information.
 */
export function saveDocumentState(
  documentId: string,
  updates: {
    completedChecklistIds?: string[];
    fieldConfirmations?: Record<string, StoredFieldConfirmation>;
  },
  storage: Storage = typeof window !== 'undefined' ? window.localStorage : ({} as Storage)
): boolean {
  if (!documentId || !documentId.trim()) return false;

  try {
    const key = getStorageKey(documentId);
    const existing = loadDocumentState(documentId, storage);

    const mergedState: StoredDocumentState = {
      version: CURRENT_STORAGE_VERSION,
      documentId: documentId.trim(),
      savedAt: new Date().toISOString(),
      completedChecklistIds: updates.completedChecklistIds !== undefined
        ? updates.completedChecklistIds
        : (existing?.completedChecklistIds || []),
      fieldConfirmations: {
        ...(existing?.fieldConfirmations || {}),
        ...(updates.fieldConfirmations || {}),
      },
    };

    storage.setItem(key, JSON.stringify(mergedState));
    return true;
  } catch (err) {
    console.warn(`[SuchnaSetu Storage] Failed to persist state for document ${documentId}:`, err);
    return false;
  }
}

/**
 * Loads stored state for a documentId.
 * Safely handles missing, invalid JSON, or malformed entries by returning null without throwing.
 */
export function loadDocumentState(
  documentId: string,
  storage: Storage = typeof window !== 'undefined' ? window.localStorage : ({} as Storage)
): StoredDocumentState | null {
  if (!documentId || !documentId.trim()) return null;

  try {
    const key = getStorageKey(documentId);
    if (!storage || typeof storage.getItem !== 'function') return null;

    const raw = storage.getItem(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!isValidStoredDocumentState(parsed, documentId)) {
      console.warn(`[SuchnaSetu Storage] Malformed or invalid state for document ${documentId}. Clearing corrupted entry.`);
      if (typeof storage.removeItem === 'function') {
        storage.removeItem(key);
      }
      return null;
    }

    return parsed;
  } catch (err) {
    console.warn(`[SuchnaSetu Storage] Error loading state for document ${documentId}:`, err);
    try {
      const key = getStorageKey(documentId);
      if (storage && typeof storage.removeItem === 'function') {
        storage.removeItem(key);
      }
    } catch {
      // Ignore secondary error during cleanup
    }
    return null;
  }
}

/**
 * Removes stored state for a single document.
 */
export function clearDocumentState(
  documentId: string,
  storage: Storage = typeof window !== 'undefined' ? window.localStorage : ({} as Storage)
): boolean {
  if (!documentId) return false;
  try {
    const key = getStorageKey(documentId);
    if (storage && typeof storage.removeItem === 'function') {
      storage.removeItem(key);
      return true;
    }
    return false;
  } catch (err) {
    console.warn(`[SuchnaSetu Storage] Failed to clear document state:`, err);
    return false;
  }
}

/**
 * Restores saved checklist items and confirmed field values into an analysis result.
 * Preserves the original extracted values while updating confirmed state.
 */
export function applyStoredStateToAnalysis(
  result: NoticeAnalysisResult,
  storage: Storage = typeof window !== 'undefined' ? window.localStorage : ({} as Storage)
): NoticeAnalysisResult {
  const savedState = loadDocumentState(result.document_id, storage);
  if (!savedState) return result;

  // Restore checklist completions
  const updatedChecklist = result.checklist.map((item) => {
    const idKey = item.id || `step_${item.step_number}`;
    const isCompleted = savedState.completedChecklistIds.includes(idKey) ||
      savedState.completedChecklistIds.includes(String(item.step_number));
    return { ...item, completed: isCompleted };
  });

  const updatedFields = { ...result.fields };
  const updatedConfirmations = { ...result.user_confirmations };

  // Restore field confirmations
  for (const [fieldKey, conf] of Object.entries(savedState.fieldConfirmations)) {
    if (updatedFields[fieldKey]) {
      updatedFields[fieldKey] = {
        ...updatedFields[fieldKey],
        user_confirmed_value: conf.confirmedValue,
        is_confirmed: true,
        status: 'found',
        uncertainty_reason: undefined,
      };

      updatedConfirmations[fieldKey] = {
        field_key: conf.fieldKey,
        original_value: conf.originalValue,
        confirmed_value: conf.confirmedValue,
        confirmed_at: conf.confirmedAt,
      };
    }
  }

  const stillNeedsConfirmation = Object.values(updatedFields).some(
    (f) => f.status === 'needs_confirmation'
  );

  return {
    ...result,
    checklist: updatedChecklist,
    fields: updatedFields,
    user_confirmations: updatedConfirmations,
    needs_user_confirmation: stillNeedsConfirmation,
  };
}

export const HISTORY_INDEX_KEY = 'suchnasetu_history_index';

export function getHistoryKey(userId?: string | null): string {
  return userId ? `suchnasetu_u_${userId}_history_index` : HISTORY_INDEX_KEY;
}

function resolveUserAndStorage(
  userIdOrStorage?: string | null | Storage,
  storageArg?: Storage
): { userId: string | null; storage: Storage } {
  let userId: string | null = null;
  let storage: Storage = typeof window !== 'undefined' ? window.localStorage : ({} as Storage);

  if (storageArg) {
    storage = storageArg;
    if (typeof userIdOrStorage === 'string') {
      userId = userIdOrStorage;
    }
  } else if (typeof userIdOrStorage === 'string') {
    userId = userIdOrStorage;
  } else if (userIdOrStorage && typeof userIdOrStorage === 'object') {
    storage = userIdOrStorage as Storage;
  }

  return { userId, storage };
}

export function getNoticeHistory(
  userIdOrStorage?: string | null | Storage,
  storageArg?: Storage
): import('../types').StoredNoticeSummary[] {
  try {
    const { userId, storage } = resolveUserAndStorage(userIdOrStorage, storageArg);
    if (!storage || typeof storage.getItem !== 'function') return [];
    const key = getHistoryKey(userId);
    const raw = storage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveNoticeToHistory(
  result: NoticeAnalysisResult,
  userIdOrStorage?: string | null | Storage,
  storageArg?: Storage
): void {
  try {
    const { userId, storage } = resolveUserAndStorage(userIdOrStorage, storageArg);
    if (!storage || typeof storage.setItem !== 'function') return;
    const history = getNoticeHistory(userId, storage);
    const existingIdx = history.findIndex((h) => h.documentId === result.document_id);

    const groundedCount = Object.values(result.fields || {}).filter(
      (f) => f && f.status === 'found'
    ).length;

    const dlVal = result.fields?.deadline?.value;
    const deadlineStr = Array.isArray(dlVal) ? dlVal.join(', ') : (dlVal ? String(dlVal) : undefined);

    const summary: import('../types').StoredNoticeSummary = {
      documentId: result.document_id,
      noticeTitle: result.notice_title || 'Untitled Notice',
      savedAt: new Date().toISOString(),
      sourceType: result.source_type,
      deadline: deadlineStr,
      groundedFieldsCount: groundedCount,
      ocrConfidence: result.ocr_confidence,
      modelUsed: result.model_used,
      rawText: result.ocr_text ? result.ocr_text.slice(0, 500) : undefined,
    };

    let updated: import('../types').StoredNoticeSummary[];
    if (existingIdx >= 0) {
      updated = [...history];
      updated[existingIdx] = summary;
    } else {
      updated = [summary, ...history].slice(0, 20);
    }
    const key = getHistoryKey(userId);
    storage.setItem(key, JSON.stringify(updated));
  } catch (err) {
    console.warn('[SuchnaSetu Storage] Failed to update notice history index:', err);
  }
}

export function deleteNoticeFromHistory(
  documentId: string,
  userIdOrStorage?: string | null | Storage,
  storageArg?: Storage
): void {
  try {
    const { userId, storage } = resolveUserAndStorage(userIdOrStorage, storageArg);
    clearDocumentState(documentId, storage);
    const history = getNoticeHistory(userId, storage);
    const filtered = history.filter((h) => h.documentId !== documentId);
    const key = getHistoryKey(userId);
    storage.setItem(key, JSON.stringify(filtered));
  } catch (err) {
    console.warn('[SuchnaSetu Storage] Failed to delete notice from history:', err);
  }
}

export function clearAllNoticeHistory(
  userIdOrStorage?: string | null | Storage,
  storageArg?: Storage
): void {
  try {
    const { userId, storage } = resolveUserAndStorage(userIdOrStorage, storageArg);
    const history = getNoticeHistory(userId, storage);
    for (const item of history) {
      clearDocumentState(item.documentId, storage);
    }
    const key = getHistoryKey(userId);
    storage.removeItem(key);
  } catch (err) {
    console.warn('[SuchnaSetu Storage] Failed to clear notice history:', err);
  }
}
