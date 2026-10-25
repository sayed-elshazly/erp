const DRAFT_PREFIX = 'nzm_jkr_draft_';

export interface DraftMetadata {
  savedAt: string;
  formId: string;
  data: any;
}

export const draftService = {
  saveDraft: (formId: string, data: any): void => {
    try {
      const meta: DraftMetadata = {
        savedAt: new Date().toISOString(),
        formId,
        data
      };
      localStorage.setItem(`${DRAFT_PREFIX}${formId}`, JSON.stringify(meta));
    } catch (e) {
      console.error('Error saving draft', e);
    }
  },

  getDraft: <T = any>(formId: string): { data: T; savedAt: string } | null => {
    try {
      const raw = localStorage.getItem(`${DRAFT_PREFIX}${formId}`);
      if (!raw) return null;
      const parsed: DraftMetadata = JSON.parse(raw);
      return { data: parsed.data as T, savedAt: parsed.savedAt };
    } catch (e) {
      console.error('Error reading draft', e);
      return null;
    }
  },

  clearDraft: (formId: string): void => {
    try {
      localStorage.removeItem(`${DRAFT_PREFIX}${formId}`);
    } catch (e) {
      console.error('Error clearing draft', e);
    }
  },

  hasDraft: (formId: string): boolean => {
    return !!localStorage.getItem(`${DRAFT_PREFIX}${formId}`);
  }
};
