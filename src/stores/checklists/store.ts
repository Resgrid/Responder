import { randomUUID } from 'expo-crypto';
import { AppState } from 'react-native';
import { create } from 'zustand';

import { getChecklistAccess, getChecklistHistory, getChecklistRun, getDueChecklists, previewChecklistOccurrence, saveChecklistRun, startChecklistRun, uploadChecklistImage } from '@/api/checklists/checklists';
import { checklistError, syncChecklistDraft } from '@/lib/checklists/sync';
import { vaultRead, vaultRemove, vaultWrite } from '@/lib/checklists/vault';
import { getBaseApiUrl } from '@/lib/storage/app';
import { QueuedEventType } from '@/models/offline-queue/queued-event';
import type { ChecklistAccess, ChecklistDefinition, ChecklistDraft, ChecklistDuePage, ChecklistHistory, ChecklistImage, ChecklistInput, ChecklistRun, ChecklistTarget } from '@/models/v4/checklists';
import useAuthStore from '@/stores/auth/store';
import { dataProtectionStore } from '@/stores/data-protection/store';
import { useOfflineQueueStore } from '@/stores/offline-queue/store';
import { securityStore } from '@/stores/security/store';

export const checklistScope = (): string | null => {
  const user = useAuthStore.getState().userId;
  const department = securityStore.getState().rights?.DepartmentId;
  return user && department ? `${getBaseApiUrl()}|${department}|${user}` : null;
};
interface ChecklistState {
  access: ChecklistAccess | null;
  scope: string | null;
  due: ChecklistDuePage | null;
  active: ChecklistDraft | null;
  draftIds: string[];
  history: ChecklistHistory[];
  hasMoreHistory: boolean;
  busy: boolean;
  locked: boolean;
  error: string | null;
  load: (unitId?: string, page?: number) => Promise<void>;
  loadHistory: (unitId?: string, page?: number) => Promise<void>;
  startDefinition: (definition: ChecklistDefinition, target: ChecklistTarget) => Promise<void>;
  openOccurrence: (id: string) => Promise<void>;
  openDraft: (id: string) => Promise<void>;
  openServer: (id: string) => Promise<void>;
  update: (input: ChecklistInput) => Promise<void>;
  addImage: (image: ChecklistImage) => Promise<void>;
  removeImage: (id: string) => Promise<void>;
  queue: (submit: boolean) => Promise<void>;
  retry: (id: string) => Promise<void>;
  useServerVersion: () => Promise<void>;
  editLocal: () => Promise<void>;
  prepareOffline: () => Promise<void>;
  close: () => void;
  conceal: () => void;
}
let writes = Promise.resolve();
const flights = new Map<string, Promise<void>>();
const serializeWrite = (job: () => Promise<void>) => {
  const next = writes.catch(() => undefined).then(job);
  writes = next;
  return next;
};
const current = (scope: string): boolean => checklistScope() === scope && useChecklistsStore.getState().scope === scope;
const assertOpen = (scope: string) => {
  const state = useChecklistsStore.getState();
  if (!current(scope) || !state.access?.Enabled) throw new Error('denied');
  if (AppState.currentState !== 'active' || (state.access.IsProtected && !dataProtectionStore.getState().isStepUpActive())) throw new Error('locked');
};
// The run sheet's text fields call update() on every keystroke. Only a draft's newest copy needs to reach
// the vault, so writes that queue up behind one in progress collapse into a single encrypted write of the
// latest copy instead of one per keystroke. A queued write finds nothing left to do once an earlier one has
// taken its copy; a failed write reports to its own caller, and the next edit or stage() writes again.
const unwritten = new Map<string, ChecklistDraft>();
const persistDraft = (draft: ChecklistDraft): Promise<void> => {
  const key = `${draft.scope}:${draft.id}`;
  unwritten.set(key, JSON.parse(JSON.stringify(draft)));
  return serializeWrite(async () => {
    const copy = unwritten.get(key);
    if (!copy) return;
    unwritten.delete(key);
    const ids = (await vaultRead<string[]>(copy.scope, 'index')) ?? [];
    if (!ids.includes(copy.id) && ids.length >= 50) throw new Error('storage_full');
    await vaultWrite(copy.scope, `draft:${copy.id}`, copy);
    if (!ids.includes(copy.id)) await vaultWrite(copy.scope, 'index', [...ids, copy.id]);
  });
};
// Keep a bounded, value-free receipt before erasing acknowledged content. A queue retry after
// a process exit can consume this receipt without recreating the completed run.
const retireDraft = (draft: ChecklistDraft) =>
  serializeWrite(async () => {
    const done = (await vaultRead<string[]>(draft.scope, 'acknowledged')) ?? [];
    await vaultWrite(draft.scope, 'acknowledged', [...done.filter((id) => id !== draft.id), draft.id].slice(-256));
    const ids = (await vaultRead<string[]>(draft.scope, 'index')) ?? [];
    await vaultWrite(
      draft.scope,
      'index',
      ids.filter((id) => id !== draft.id)
    );
    await vaultRemove(draft.scope, `draft:${draft.id}`);
    if (draft.run.OccurrenceId) await vaultRemove(draft.scope, `preview:${draft.run.OccurrenceId}`);
    if (current(draft.scope)) useChecklistsStore.setState((state) => ({ draftIds: state.draftIds.filter((id) => id !== draft.id) }));
  });
const stage = async (draft: ChecklistDraft) => {
  assertOpen(draft.scope);
  if (draft.run.CanEdit) await persistDraft(draft);
  assertOpen(draft.scope);
  const ids = useChecklistsStore.getState().draftIds;
  useChecklistsStore.setState({ active: draft, draftIds: !draft.run.CanEdit || ids.includes(draft.id) ? ids : [...ids, draft.id], error: null });
};
const readAccess = async (): Promise<string> => {
  const scope = checklistScope();
  if (!scope) throw new Error('denied');
  if (useChecklistsStore.getState().scope !== scope) useChecklistsStore.getState().conceal();
  const access = await getChecklistAccess();
  if (scope !== checklistScope() || access.UserId !== useAuthStore.getState().userId || access.DepartmentId !== Number(securityStore.getState().rights?.DepartmentId)) throw new Error('denied');
  useChecklistsStore.setState({ access, scope, locked: access.IsProtected && !dataProtectionStore.getState().isStepUpActive() });
  assertOpen(scope);
  return scope;
};
const pending = (run: ChecklistRun, scope: string, occurrence = false): ChecklistDraft => ({
  id: run.Id,
  scope,
  run,
  start: occurrence ? { CompletionId: run.Id, OccurrenceId: run.OccurrenceId } : { CompletionId: run.Id, DefinitionId: run.DefinitionId, VersionId: run.VersionId, TargetId: run.Target.Id },
  input: run.Input,
  images: [],
  queued: false,
  submit: false,
});
const enqueue = (scope: string, id: string) => {
  const queue = useOfflineQueueStore.getState();
  const existing = queue.queuedEvents.find((e) => e.type === QueuedEventType.CHECKLIST_COMPLETION && e.data.scope === scope && e.data.id === id);
  if (existing) queue.retryEvent(existing.id);
  else queue.addEvent(QueuedEventType.CHECKLIST_COMPLETION, { scope, id }, 5);
};
export const useChecklistsStore = create<ChecklistState>()((set, get) => ({
  access: null,
  scope: null,
  due: null,
  active: null,
  draftIds: [],
  history: [],
  hasMoreHistory: false,
  busy: false,
  locked: false,
  error: null,
  load: async (unitId, page = 0) => {
    set({ busy: true, error: null });
    try {
      const scope = await readAccess();
      const due = await getDueChecklists(page, unitId);
      assertOpen(scope);
      await writes.catch(() => undefined);
      const draftIds = (await vaultRead<string[]>(scope, 'index')) ?? [];
      await vaultWrite(scope, `due:${unitId ?? 'self'}:${page}`, due);
      assertOpen(scope);
      set({ due, draftIds, locked: false });
    } catch (error) {
      const code = checklistError(error);
      // A transient connection failure may reuse a previously authorized, encrypted working set.
      if (code === 'retry' && get().scope) {
        try {
          const scope = get().scope!;
          assertOpen(scope);
          const due = await vaultRead<ChecklistDuePage>(scope, `due:${unitId ?? 'self'}:${page}`);
          const draftIds = (await vaultRead<string[]>(scope, 'index')) ?? [];
          assertOpen(scope);
          set({ due, draftIds, error: 'offline' });
        } catch {
          get().conceal();
          set({ error: 'locked' });
        }
      } else {
        get().conceal();
        set({ error: code });
      }
    } finally {
      set({ busy: false });
    }
  },
  loadHistory: async (unitId, page = 0) => {
    try {
      const scope = await readAccess();
      const result = await getChecklistHistory(page, unitId);
      assertOpen(scope);
      set({ history: result.Data, hasMoreHistory: result.HasMore });
    } catch (error) {
      set({ error: checklistError(error) });
    }
  },
  startDefinition: async (definition, target) => {
    const scope = get().scope!;
    assertOpen(scope);
    const form = definition.PublishedForm;
    const id = randomUUID();
    const run: ChecklistRun = {
      Id: id,
      DefinitionId: definition.Id,
      OccurrenceId: null,
      VersionId: definition.VersionId,
      VersionNumber: definition.VersionNumber,
      Revision: 0,
      State: 0,
      IsProtected: !!get().access?.IsProtected,
      IsPreview: true,
      CanEdit: true,
      CreatedBy: useAuthStore.getState().userId!,
      UpdatedOn: new Date().toISOString(),
      Form: form,
      Target: target,
      Input: { Revision: 0, Answers: [] },
      Files: [],
    };
    await stage(pending(run, scope));
  },
  openOccurrence: async (id) => {
    const scope = get().scope!;
    assertOpen(scope);
    let run: ChecklistRun;
    try {
      run = await previewChecklistOccurrence(id);
      assertOpen(scope);
      await vaultWrite(scope, `preview:${id}`, run);
    } catch (error) {
      if (checklistError(error) !== 'retry') throw error;
      run = (await vaultRead<ChecklistRun>(scope, `preview:${id}`))!;
      if (!run) throw error;
    }
    assertOpen(scope);
    const saved = await vaultRead<ChecklistDraft>(scope, `draft:${run.Id}`);
    if (saved) {
      assertOpen(scope);
      set({ active: saved });
    } else await stage(pending(run, scope, true));
  },
  openDraft: async (id) => {
    const scope = get().scope!;
    assertOpen(scope);
    await writes.catch(() => undefined);
    const draft = await vaultRead<ChecklistDraft>(scope, `draft:${id}`);
    assertOpen(scope);
    if (draft?.scope !== scope) throw new Error('denied');
    set({ active: draft });
  },
  openServer: async (id) => {
    const scope = await readAccess();
    const run = await getChecklistRun(id);
    assertOpen(scope);
    await stage(pending(run, scope));
  },
  update: async (input) => {
    const draft = get().active;
    if (!draft || draft.queued || !draft.run.CanEdit) throw new Error('denied');
    assertOpen(draft.scope);
    const changed = { ...draft, input };
    set({ active: changed });
    await persistDraft(changed);
  },
  addImage: async (image) => {
    const draft = get().active;
    if (!draft || draft.queued || !draft.run.CanEdit) throw new Error('denied');
    if (image.base64.length > 14 * 1024 * 1024 || draft.images.filter((i) => i.itemId === image.itemId).length + draft.run.Files.filter((i) => i.ItemId === image.itemId).length >= 3) throw new Error('storage_full');
    const answers = [...draft.input.Answers.filter((a) => a.ItemId !== image.itemId), { ...(draft.input.Answers.find((a) => a.ItemId === image.itemId) ?? {}), ItemId: image.itemId, Status: 1 }];
    await stage({ ...draft, images: [...draft.images, image], input: { ...draft.input, Answers: answers } });
  },
  removeImage: async (id) => {
    const draft = get().active;
    if (!draft || draft.queued || !draft.run.CanEdit) throw new Error('denied');
    await stage({ ...draft, images: draft.images.filter((image) => image.id !== id) });
  },
  queue: async (submit) => {
    const draft = get().active;
    if (!draft || !draft.run.CanEdit) throw new Error('denied');
    await writes;
    const queued = { ...draft, queued: true, submit, input: { ...draft.input, ClientCompletedOn: submit ? (draft.input.ClientCompletedOn ?? new Date().toISOString()) : draft.input.ClientCompletedOn } };
    await stage(queued);
    enqueue(draft.scope, draft.id);
  },
  retry: async (id) => {
    const scope = await readAccess();
    await get().openDraft(id);
    const draft = get().active!;
    await stage({ ...draft, queued: true, error: undefined });
    enqueue(scope, id);
  },
  prepareOffline: async () => {
    const scope = await readAccess();
    for (const row of get().due?.Occurrences ?? []) {
      const run = await previewChecklistOccurrence(row.Id);
      assertOpen(scope);
      await vaultWrite(scope, `preview:${row.Id}`, run);
    }
  },
  editLocal: async () => {
    const draft = get().active;
    if (!draft) return;
    assertOpen(draft.scope);
    if (flights.has(`${draft.scope}:${draft.id}`)) throw new Error('retry');
    const queue = useOfflineQueueStore.getState();
    for (const event of queue.queuedEvents) if (event.type === QueuedEventType.CHECKLIST_COMPLETION && event.data.scope === draft.scope && event.data.id === draft.id) queue.removeEvent(event.id);
    await stage({ ...draft, queued: false });
  },
  useServerVersion: async () => {
    const draft = get().active;
    if (!draft) return;
    if (flights.has(`${draft.scope}:${draft.id}`)) throw new Error('retry');
    const scope = await readAccess();
    const run = await getChecklistRun(draft.id);
    assertOpen(scope);
    if (flights.has(`${scope}:${draft.id}`)) throw new Error('retry');
    if (run.State > 0) await retireDraft(draft);
    await stage(pending(run, scope));
    const queue = useOfflineQueueStore.getState();
    for (const event of queue.queuedEvents) if (event.type === QueuedEventType.CHECKLIST_COMPLETION && event.data.scope === scope && event.data.id === draft.id) queue.removeEvent(event.id);
  },
  close: () => set({ active: null }),
  conceal: () => {
    set({ due: null, active: null, history: [], draftIds: [], locked: true });
  },
}));

export const flushChecklistDraft = (scope: string, id: string): Promise<void> => {
  const key = `${scope}:${id}`;
  const existing = flights.get(key);
  if (existing) return existing;
  const work = (async () => {
    try {
      if (scope !== checklistScope()) throw new Error('denied');
      const verified = await readAccess();
      if (verified !== scope) throw new Error('denied');
      await writes;
      const draft = await vaultRead<ChecklistDraft>(scope, `draft:${id}`);
      assertOpen(scope);
      if (!draft) {
        const done = (await vaultRead<string[]>(scope, 'acknowledged')) ?? [];
        assertOpen(scope);
        if (done.includes(id)) return;
        throw new Error('denied');
      }
      if (draft.scope !== scope) throw new Error('denied');
      if (!draft.queued) {
        if (draft.run.State > 0) await retireDraft(draft);
        return;
      }
      const receipt = await syncChecklistDraft(draft, {
        check: () => assertOpen(scope),
        start: (d) => (d.input.Revision === 0 ? startChecklistRun(d.start) : getChecklistRun(d.id)),
        upload: (d, index) => uploadChecklistImage(d.id, d.input.Revision, d.images[index]),
        save: (d) => saveChecklistRun(d.id, d.input, d.submit),
        persist: persistDraft,
      });
      if (receipt.run.State > 0) await retireDraft(receipt);
      assertOpen(scope);
      if (current(scope) && useChecklistsStore.getState().active?.id === id) useChecklistsStore.setState({ active: receipt, error: null });
    } catch (error) {
      const code = checklistError(error);
      if (current(scope)) {
        if (code === 'locked' || code === 'denied') useChecklistsStore.getState().conceal();
        useChecklistsStore.setState({ error: code });
      }
      // The ordinary queue logs this Error, so only a fixed, value-free code leaves this boundary.
      throw new Error(`checklist_${code}`);
    }
  })();
  flights.set(key, work);
  work.finally(() => flights.delete(key)).catch(() => undefined);
  return work;
};

let expiry: ReturnType<typeof setTimeout> | null = null;
const concealOnIdentityChange = () => {
  const state = useChecklistsStore.getState();
  if (state.scope && state.scope !== checklistScope()) {
    state.conceal();
    useChecklistsStore.setState({ scope: null, access: null });
  }
};
useAuthStore.subscribe(concealOnIdentityChange);
securityStore.subscribe(concealOnIdentityChange);
dataProtectionStore.subscribe((state) => {
  if (expiry) clearTimeout(expiry);
  if (!state.isStepUpActive()) {
    if (useChecklistsStore.getState().access?.IsProtected) useChecklistsStore.getState().conceal();
  } else if (state.stepUpExpiresAt)
    expiry = setTimeout(
      () => {
        if (useChecklistsStore.getState().access?.IsProtected) useChecklistsStore.getState().conceal();
      },
      Math.max(0, state.stepUpExpiresAt - Date.now())
    );
});
AppState.addEventListener('change', (state) => {
  if (state !== 'active') useChecklistsStore.getState().conceal();
});
