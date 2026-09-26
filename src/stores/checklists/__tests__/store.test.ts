const mockDisk = new Map<string, string>();
jest.mock('expo-crypto', () => ({ randomUUID: () => '11111111-1111-4111-8111-111111111111' }));
jest.mock('@/api/checklists/checklists', () => ({ getChecklistAccess: jest.fn(), getDueChecklists: jest.fn(), getChecklistHistory: jest.fn(), getChecklistRun: jest.fn(), previewChecklistOccurrence: jest.fn(), startChecklistRun: jest.fn(), saveChecklistRun: jest.fn(), uploadChecklistImage: jest.fn() }));
jest.mock('@/lib/checklists/vault', () => ({
  vaultRead: jest.fn(async (s: string, n: string) => { const v = mockDisk.get(`${s}:${n}`); return v ? JSON.parse(v) : null; }),
  vaultWrite: jest.fn(async (s: string, n: string, v: unknown) => { mockDisk.set(`${s}:${n}`, JSON.stringify(v)); }),
  vaultRemove: jest.fn(async (s: string, n: string) => { mockDisk.delete(`${s}:${n}`); }),
}));
jest.mock('@/lib/storage/app', () => ({ getBaseApiUrl: () => 'server' }));
jest.mock('@/stores/auth/store', () => { const { create } = jest.requireActual('zustand'); return { __esModule: true, default: create(() => ({ userId: 'author' })) }; });
jest.mock('@/stores/security/store', () => { const { create } = jest.requireActual('zustand'); return { securityStore: create(() => ({ rights: { DepartmentId: '77' } })) }; });
jest.mock('@/stores/data-protection/store', () => { const { create } = jest.requireActual('zustand'); return { dataProtectionStore: create((_set: unknown, get: () => { grantToken: string | null; stepUpExpiresAt: number | null }) => ({ grantToken: null, stepUpExpiresAt: null, isStepUpActive: () => !!get().grantToken && (get().stepUpExpiresAt ?? 0) > Date.now() })) }; });
jest.mock('@/stores/offline-queue/store', () => { const { create } = jest.requireActual('zustand'); return { useOfflineQueueStore: create(() => ({ queuedEvents: [], addEvent: jest.fn(), retryEvent: jest.fn(), removeEvent: jest.fn() })) }; });

import { AppState } from 'react-native';
import * as api from '@/api/checklists/checklists';
import { draft, run } from '@/lib/checklists/__tests__/fixtures';
import { vaultRead, vaultWrite } from '@/lib/checklists/vault';
import type { ChecklistDefinition, ChecklistRun } from '@/models/v4/checklists';
import useAuthStore from '@/stores/auth/store';
import { checklistScope, flushChecklistDraft, useChecklistsStore } from '@/stores/checklists/store';
import { dataProtectionStore } from '@/stores/data-protection/store';
import { useOfflineQueueStore } from '@/stores/offline-queue/store';
import { securityStore } from '@/stores/security/store';
const server = jest.mocked(api);
const scope = 'server|77|author';
const due = { Occurrences: [], Definitions: [], HasMoreOccurrences: false, HasMoreDefinitions: false };
const definition = (): ChecklistDefinition => ({ Id: 'definition', Revision: 1, VersionId: 'version-1', VersionNumber: 1, Retired: false, IsProtected: false, UpdatedOn: run().UpdatedOn, Form: run().Form, PublishedForm: run().Form, Targets: [run().Target] });

beforeEach(() => {
  jest.useFakeTimers(); jest.clearAllMocks(); mockDisk.clear(); Object.defineProperty(AppState, 'currentState', { value: 'active', configurable: true });
  useAuthStore.setState({ userId: 'author' }); securityStore.setState({ rights: { ...securityStore.getState().rights!, DepartmentId: '77' } });
  dataProtectionStore.setState({ grantToken: null, stepUpExpiresAt: null });
  useChecklistsStore.setState({ access: null, scope: null, active: null, due: null, history: [], draftIds: [], error: null, locked: false });
  server.getChecklistAccess.mockResolvedValue({ DepartmentId: 77, UserId: 'author', CanManage: false, Enabled: true, IsProtected: false });
  server.getDueChecklists.mockResolvedValue(due); server.getChecklistRun.mockResolvedValue(run()); server.startChecklistRun.mockResolvedValue(run());
  server.saveChecklistRun.mockImplementation(async (_id, input, submit) => ({ ...run(), Revision: input.Revision + 1, Input: { ...input, Revision: input.Revision + 1 }, State: submit ? 2 : 0, CanEdit: !submit }));
});
afterEach(() => { dataProtectionStore.setState({ grantToken: null, stepUpExpiresAt: null }); jest.useRealTimers(); });

it('keeps values in the dedicated vault and only references in the ordinary offline queue', async () => {
  await useChecklistsStore.getState().load('12'); expect(server.getDueChecklists).toHaveBeenCalledWith(0, '12');
  await useChecklistsStore.getState().startDefinition(definition(), run().Target);
  await useChecklistsStore.getState().update({ Revision: 0, Answers: [], Note: 'SYNTHETIC PHI' });
  await useChecklistsStore.getState().queue(true);
  expect(useOfflineQueueStore.getState().addEvent).toHaveBeenCalledWith('checklist_completion', { scope, id: run().Id }, 5);
  expect(JSON.stringify(jest.mocked(useOfflineQueueStore.getState().addEvent).mock.calls)).not.toContain('SYNTHETIC PHI');
  useChecklistsStore.getState().close(); await useChecklistsStore.getState().openDraft(run().Id);
  expect(useChecklistsStore.getState().active?.input.Note).toBe('SYNTHETIC PHI');
});
it('collapses a burst of keystrokes into writes of the newest note instead of one encrypted write per key', async () => {
  await useChecklistsStore.getState().load();
  await useChecklistsStore.getState().startDefinition(definition(), run().Target);
  jest.mocked(vaultWrite).mockClear();
  const typed = 'Hydrant cap missing';

  await Promise.all([...typed].map((_, index) => useChecklistsStore.getState().update({ Revision: 0, Answers: [], Note: typed.slice(0, index + 1) })));

  const draftWrites = jest.mocked(vaultWrite).mock.calls.filter(([, name]) => name === `draft:${run().Id}`);
  expect(draftWrites.length).toBeLessThanOrEqual(2);
  expect(JSON.parse(mockDisk.get(`${scope}:draft:${run().Id}`)!).input.Note).toBe(typed);
});
it('previews occurrences without starting server work and reopens prepared data offline', async () => {
  await useChecklistsStore.getState().load();
  server.previewChecklistOccurrence.mockResolvedValue({ ...run(), Revision: 0, IsPreview: true, OccurrenceId: 'occurrence', Input: { Revision: 0, Answers: [] } });
  await useChecklistsStore.getState().openOccurrence('occurrence'); useChecklistsStore.getState().close();
  server.previewChecklistOccurrence.mockRejectedValue(new Error('network'));
  await useChecklistsStore.getState().openOccurrence('occurrence');
  expect(useChecklistsStore.getState().active?.start.OccurrenceId).toBe('occurrence'); expect(server.startChecklistRun).not.toHaveBeenCalled();
});
it('retains queued content on a stale revision and requires explicit replacement', async () => {
  await useChecklistsStore.getState().load(); await vaultWrite(scope, `draft:${run().Id}`, draft()); await vaultWrite(scope, 'index', [run().Id]);
  server.getChecklistRun.mockResolvedValue({ ...run(), Revision: 8 }); server.saveChecklistRun.mockRejectedValue({ response: { status: 409, data: { Title: 'PRIVATE' } } });
  await expect(flushChecklistDraft(scope, run().Id)).rejects.toThrow('checklist_conflict');
  const saved = await vaultRead<ReturnType<typeof draft>>(scope, `draft:${run().Id}`);
  expect(saved?.input.Revision).toBe(1); expect(saved?.queued).toBe(true);
  await useChecklistsStore.getState().openDraft(run().Id); await useChecklistsStore.getState().editLocal();
  expect(useChecklistsStore.getState().active?.queued).toBe(false);
});
it('removes acknowledged values, retains a bounded receipt and tolerates a queue replay after restart', async () => {
  await useChecklistsStore.getState().load(); await vaultWrite(scope, `draft:${run().Id}`, draft()); await vaultWrite(scope, 'index', [run().Id]);
  await flushChecklistDraft(scope, run().Id);
  expect(await vaultRead(scope, `draft:${run().Id}`)).toBeNull(); expect(await vaultRead(scope, 'index')).toEqual([]);
  await flushChecklistDraft(scope, run().Id); expect(server.saveChecklistRun).toHaveBeenCalledTimes(1);
});
it('checks fresh flag and membership access before decrypting or sending queued work', async () => {
  await useChecklistsStore.getState().load(); await vaultWrite(scope, `draft:${run().Id}`, draft()); jest.mocked(vaultRead).mockClear();
  server.getChecklistAccess.mockResolvedValue({ DepartmentId: 77, UserId: 'author', CanManage: false, Enabled: false, IsProtected: false });
  await expect(flushChecklistDraft(scope, run().Id)).rejects.toThrow('checklist_denied');
  expect(vaultRead).not.toHaveBeenCalled(); expect(server.saveChecklistRun).not.toHaveBeenCalled(); expect(mockDisk.has(`${scope}:draft:${run().Id}`)).toBe(true);
});
it('conceals at absolute ADP expiry without deleting unsent data', async () => {
  server.getChecklistAccess.mockResolvedValue({ DepartmentId: 77, UserId: 'author', CanManage: false, Enabled: true, IsProtected: true });
  dataProtectionStore.setState({ grantToken: 'synthetic-grant', stepUpExpiresAt: Date.now() + 1000 });
  await useChecklistsStore.getState().load(); await useChecklistsStore.getState().startDefinition(definition(), run().Target);
  jest.advanceTimersByTime(1001);
  expect(useChecklistsStore.getState().active).toBeNull(); expect(useChecklistsStore.getState().due).toBeNull();
  await expect(useChecklistsStore.getState().openDraft(run().Id)).rejects.toThrow('locked'); expect(mockDisk.has(`${scope}:draft:${run().Id}`)).toBe(true);
});
it('rejects another identity and discards late due responses after an identity switch', async () => {
  let release!: (value: typeof due) => void; server.getDueChecklists.mockReturnValue(new Promise(resolve => { release = resolve; }));
  const loading = useChecklistsStore.getState().load(); await Promise.resolve(); await Promise.resolve();
  useAuthStore.setState({ userId: 'other' }); release(due); await loading;
  expect(checklistScope()).toBe('server|77|other'); expect(useChecklistsStore.getState().due).toBeNull();
  await expect(flushChecklistDraft(scope, run().Id)).rejects.toThrow('checklist_denied');
});
it('does not persist read-only historical runs as editable drafts', async () => {
  server.getChecklistRun.mockResolvedValue({ ...run(), State: 2, CanEdit: false });
  await useChecklistsStore.getState().openServer(run().Id);
  expect(useChecklistsStore.getState().active?.run.State).toBe(2); expect(await vaultRead(scope, 'index')).toBeNull();
});
it('rejects a late server response when the grant expires during upload', async () => {
  server.getChecklistAccess.mockResolvedValue({ DepartmentId: 77, UserId: 'author', CanManage: false, Enabled: true, IsProtected: true });
  dataProtectionStore.setState({ grantToken: 'synthetic-grant', stepUpExpiresAt: Date.now() + 1000 }); await useChecklistsStore.getState().load();
  const local = draft(); local.images = [{ id: 'image', itemId: 'first', name: 'evidence.jpg', contentType: 'image/jpeg', base64: 'synthetic' }]; await vaultWrite(scope, `draft:${local.id}`, local);
  server.uploadChecklistImage.mockImplementation(async () => { jest.advanceTimersByTime(1001); return { ...run(), Revision: 2 }; });
  await expect(flushChecklistDraft(scope, local.id)).rejects.toThrow('checklist_locked');
  expect(server.saveChecklistRun).not.toHaveBeenCalled(); expect((await vaultRead<ReturnType<typeof draft>>(scope, `draft:${local.id}`))?.images).toHaveLength(1);
});

it('discards the old queued draft when the user explicitly adopts a submitted server version', async () => {
 await useChecklistsStore.getState().load(); await vaultWrite(scope, `draft:${run().Id}`, draft()); await vaultWrite(scope, 'index', [run().Id]);
 await useChecklistsStore.getState().openDraft(run().Id); server.getChecklistRun.mockResolvedValue({ ...run(), State: 2, CanEdit: false });
 await useChecklistsStore.getState().useServerVersion();
 expect(useChecklistsStore.getState().active?.queued).toBe(false); expect(await vaultRead(scope, `draft:${run().Id}`)).toBeNull();
 await flushChecklistDraft(scope, run().Id); expect(server.saveChecklistRun).not.toHaveBeenCalled();
});
