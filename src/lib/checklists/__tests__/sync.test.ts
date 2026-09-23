import type { ChecklistDraft, ChecklistRun } from '@/models/v4/checklists';
import { checklistFailed, isChecklistRequired, visibleChecklistItems } from '@/lib/checklists/form';
import { checklistError, syncChecklistDraft, type ChecklistSyncPort } from '@/lib/checklists/sync';
import { draft, run } from '@/lib/checklists/__tests__/fixtures';

const port = (): jest.Mocked<ChecklistSyncPort> => ({
  start: jest.fn<Promise<ChecklistRun>, [ChecklistDraft]>(async () => run()),
  upload: jest.fn<Promise<ChecklistRun>, [ChecklistDraft, number]>(async () => ({ ...run(), Revision: 2 })),
  save: jest.fn<Promise<ChecklistRun>, [ChecklistDraft]>(async d => ({ ...run(), Revision: 3, Input: { ...d.input, Revision: 3 }, State: 2, CanEdit: false })),
  persist: jest.fn<Promise<void>, [ChecklistDraft]>(async () => undefined), check: jest.fn(),
});

describe('checklist offline sync', () => {
  it('uses the pinned form and uploads evidence before finalization, persisting each receipt', async () => {
    const local = draft(); local.images = [{ id: 'photo', itemId: 'first', name: 'photo.png', contentType: 'image/png', base64: 'synthetic' }]; const p = port();
    p.save.mockImplementation(async d => { expect(d.input.Revision).toBe(2); return { ...run(), State: 2, Revision: 3, Input: { ...d.input, Revision: 3 } }; });
    const result = await syncChecklistDraft(local, p);
    expect(p.upload).toHaveBeenCalledTimes(1);
    expect(p.persist).toHaveBeenCalledTimes(2); expect(result.queued).toBe(false); expect(result.images).toEqual([]);
    expect(local.images).toHaveLength(1); expect(local.input.Revision).toBe(1);
  });
  it('does not silently adopt a newer server revision for different local answers', async () => {
    const p = port(); p.start.mockResolvedValue({ ...run(), Revision: 8 });
    p.save.mockRejectedValue({ response: { status: 409 } });
    await expect(syncChecklistDraft(draft(), p)).rejects.toEqual({ response: { status: 409 } });
    expect(p.save.mock.calls[0][0].input.Revision).toBe(1); expect(p.persist).not.toHaveBeenCalled();
  });
  it('retries a final-response loss using the same answers and no new evidence uploads', async () => {
    const p = port(); p.start.mockResolvedValue({ ...run(), State: 2, Revision: 3, CanEdit: false });
    const result = await syncChecklistDraft(draft(), p);
    expect(p.upload).not.toHaveBeenCalled(); expect(p.save.mock.calls[0][0].input.Answers).toEqual(draft().input.Answers); expect(result.run.State).toBe(2);
  });
  it('refuses a mismatched version and preserves the original encrypted draft input', async () => {
    const local = draft(); const p = port(); p.start.mockResolvedValue({ ...run(), VersionId: 'different' });
    await expect(syncChecklistDraft(local,p)).rejects.toThrow('checklist_conflict'); expect(p.save).not.toHaveBeenCalled(); expect(local.queued).toBe(true);
  });
  it('rechecks permission after each awaited operation', async () => {
    const p=port(); p.check.mockImplementationOnce(() => undefined).mockImplementation(() => { throw new Error('locked'); });
    await expect(syncChecklistDraft(draft(),p)).rejects.toThrow('locked'); expect(p.upload).not.toHaveBeenCalled(); expect(p.save).not.toHaveBeenCalled();
  });
  it('maps server failures to safe codes without propagating response values', () => {
    expect(checklistError({ response: { status:403, data:{type:'protected_data_required',title:'PRIVATE'} } })).toBe('locked');
    expect(checklistError({ response: { status:409, data:{title:'PRIVATE'} } })).toBe('conflict');
    expect(checklistError(new Error('PRIVATE'))).toBe('retry');
  });
});
describe('checklist conditional form', () => {
  it('hides dependent branches after the earlier answer changes', () => {
    const form = run().Form; form.Sections[0].Items.push({ ...form.Sections[0].Items[0], Id:'second', VisibleWhen:{ItemId:'first',EqualsValue:'fail'} });
    expect(visibleChecklistItems(form,[{ItemId:'first',Status:1,Value:'pass'}]).map(i=>i.Id)).toEqual(['first']);
    expect(visibleChecklistItems(form,[{ItemId:'first',Status:1,Value:'fail'}]).map(i=>i.Id)).toEqual(['first','second']);
    expect(isChecklistRequired({...form.Sections[0].Items[1],Required:false,RequiredWhen:{ItemId:'first',EqualsValue:'fail'}},[{ItemId:'first',Status:1,Value:'fail'}])).toBe(true);
  });
  it('identifies critical and numeric failures without treating N/A as failure', () => {
    const item = run().Form.Sections[0].Items[0]; expect(checklistFailed(item,{ItemId:item.Id,Status:1,Value:'fail'})).toBe(true);
    expect(checklistFailed({...item,Type:3,Minimum:10},{ItemId:item.Id,Status:1,Value:'9'})).toBe(true);
    expect(checklistFailed(item,{ItemId:item.Id,Status:2})).toBe(false);
  });
});
