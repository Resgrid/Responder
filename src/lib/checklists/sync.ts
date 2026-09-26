import type { ChecklistDraft, ChecklistRun } from '@/models/v4/checklists';

export interface ChecklistSyncPort {
  start: (draft: ChecklistDraft) => Promise<ChecklistRun>;
  upload: (draft: ChecklistDraft, index: number) => Promise<ChecklistRun>;
  save: (draft: ChecklistDraft) => Promise<ChecklistRun>;
  persist: (draft: ChecklistDraft) => Promise<void>;
  check: () => void;
}
/** Receipts are persisted after each step. Never replace a nonzero local revision with a fresh server read. */
export const syncChecklistDraft = async (original: ChecklistDraft, port: ChecklistSyncPort): Promise<ChecklistDraft> => {
  const draft: ChecklistDraft = JSON.parse(JSON.stringify(original));
  port.check();
  const started = await port.start(draft);
  port.check();
  if (started.Id !== draft.id || started.VersionId !== draft.run.VersionId || (!started.CanEdit && started.State === 0)) throw new Error('checklist_conflict');
  if (draft.input.Revision === 0) {
    if (started.Revision !== 1 || started.State !== 0) throw new Error('checklist_conflict');
    draft.input.Revision = 1;
    draft.run = started;
    await port.persist(draft);
  }
  // A final-response replay goes straight to the server's content-hash idempotency check.
  if (started.State === 0) {
    while (draft.images.length > 0) {
      port.check();
      const receipt = await port.upload(draft, 0);
      port.check();
      draft.input.Revision = receipt.Revision;
      draft.run = receipt;
      draft.images.shift();
      await port.persist(draft);
    }
  } else if (draft.images.length > 0) {
    throw new Error('checklist_conflict');
  }
  port.check();
  const receipt = await port.save(draft);
  port.check();
  draft.run = receipt;
  draft.input = receipt.Input;
  draft.queued = false;
  delete draft.error;
  await port.persist(draft);
  return draft;
};

export const checklistError = (error: unknown): string => {
  const response = (error as { response?: { status?: number; data?: { type?: string } } })?.response;
  if (response?.data?.type === 'protected_data_required') return 'locked';
  if (response?.status === 409 || (error instanceof Error && error.message === 'checklist_conflict')) return 'conflict';
  if (response?.status === 401 || response?.status === 403 || response?.status === 404) return 'denied';
  if (response?.status === 400 || response?.status === 413) return 'validation';
  if (error instanceof Error && ['locked', 'denied', 'storage_full'].includes(error.message)) return error.message;
  return 'retry';
};
