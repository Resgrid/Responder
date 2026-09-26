import type { ChecklistDraft, ChecklistRun } from '@/models/v4/checklists';
export const run = (): ChecklistRun => ({ Id: '11111111-1111-4111-8111-111111111111', DefinitionId: 'definition', VersionId: 'version-1', VersionNumber: 1, OccurrenceId: null, Revision: 1, State: 0,
  IsProtected: false, IsPreview: false, CanEdit: true, CreatedBy: 'author', UpdatedOn: '2026-09-08T10:00:00Z',
  Target: { Type: 0, Id: '77', Name: 'Synthetic department' }, Input: { Revision: 1, Answers: [{ ItemId: 'first', Status: 1, Value: 'pass' }] }, Files: [],
  Form: { Name: 'Synthetic readiness check', Category: 0, TargetType: 0, PassThreshold: 100, RequireLocation: false, RequiresIndependentWitness: false,
    Sections: [{ Id: 'section', Name: 'Checks', Items: [{ Id: 'first', Name: 'Ready', Type: 0, Required: true, Critical: true, AllowNotApplicable: true, RequireNoteOnFail: true, RequirePhotoOnFail: true, Weight: 1, PassingValue: 'pass', Options: [] }] }] } });
export const draft = (): ChecklistDraft => { const data = run(); return { id: data.Id, scope: 'server|77|author', start: { CompletionId: data.Id, DefinitionId: data.DefinitionId, VersionId: data.VersionId, TargetId: data.Target.Id }, run: data, input: { ...data.Input }, images: [], queued: true, submit: true }; };
