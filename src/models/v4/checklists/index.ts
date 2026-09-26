export interface ChecklistResult<T> {
  Data: T;
  HasMore: boolean;
  ContractVersion: number;
}
export interface ChecklistAccess {
  DepartmentId: number;
  UserId: string;
  Enabled: boolean;
  CanManage: boolean;
  IsProtected: boolean;
}
export interface ChecklistTarget {
  Type: number;
  Id: string;
  Name: string;
  GroupId?: number | null;
}
export interface ChecklistCondition {
  ItemId: string;
  EqualsValue: string;
}
export interface ChecklistItem {
  Id: string;
  Name: string;
  Instructions?: string | null;
  Type: number;
  Required: boolean;
  Critical: boolean;
  AllowNotApplicable: boolean;
  RequireNoteOnFail: boolean;
  RequirePhotoOnFail: boolean;
  Weight: number;
  Units?: string | null;
  Minimum?: number | null;
  Maximum?: number | null;
  PassingValue: string;
  Options: string[];
  VisibleWhen?: ChecklistCondition | null;
  RequiredWhen?: ChecklistCondition | null;
}
export interface ChecklistForm {
  Name: string;
  Instructions?: string | null;
  TargetType: number;
  Category: number;
  PassThreshold: number;
  RequireLocation: boolean;
  RequiresIndependentWitness: boolean;
  Sections: { Id: string; Name: string; Items: ChecklistItem[] }[];
}
export interface ChecklistAnswer {
  ItemId: string;
  Status: number;
  Value?: string | null;
  Note?: string | null;
  NotApplicableReason?: string | null;
}
export interface ChecklistInput {
  Revision: number;
  Answers: ChecklistAnswer[];
  Note?: string | null;
  LocationDescription?: string | null;
  Latitude?: number | null;
  Longitude?: number | null;
  ClientCompletedOn?: string | null;
}
export interface ChecklistFile {
  Id: string;
  ItemId: string;
  Name: string;
  ContentType: string;
  Size: number;
  ScanState: number;
}
export interface ChecklistRun {
  Id: string;
  OccurrenceId: string | null;
  DefinitionId: string;
  VersionId: string;
  VersionNumber: number;
  Revision: number;
  State: number;
  IsProtected: boolean;
  IsPreview: boolean;
  CanEdit: boolean;
  CreatedBy: string;
  UpdatedOn: string;
  SubmittedOn?: string | null;
  SubmissionHash?: string | null;
  WitnessUserId?: string | null;
  WitnessAttestation?: string | null;
  Score?: number | null;
  Passed?: boolean | null;
  Target: ChecklistTarget;
  Form: ChecklistForm;
  Input: ChecklistInput;
  Files: ChecklistFile[];
}
export interface ChecklistDefinition {
  Id: string;
  Revision: number;
  VersionId: string;
  VersionNumber: number;
  Retired: boolean;
  IsProtected: boolean;
  UpdatedOn: string;
  Form: ChecklistForm;
  PublishedForm: ChecklistForm;
  Targets: ChecklistTarget[];
}
export interface ChecklistDue {
  Id: string;
  CompletionId: string;
  DefinitionId: string;
  VersionId: string;
  Name: string;
  Target: ChecklistTarget;
  State: number;
  Revision: number;
  UpdatedOn: string;
  PeriodStartUtc: string;
  WindowEndUtc: string;
  CanStart: boolean;
}
export interface ChecklistDuePage {
  Occurrences: ChecklistDue[];
  Definitions: ChecklistDefinition[];
  HasMoreOccurrences: boolean;
  HasMoreDefinitions: boolean;
}
export interface ChecklistHistory {
  Id: string;
  DefinitionId: string;
  VersionId: string;
  TargetType: number;
  TargetId: string;
  TargetName: string;
  CreatedBy: string;
  State: number;
  Revision: number;
  IsProtected: boolean;
  UpdatedOn: string;
  SubmittedOn?: string | null;
  Score?: number | null;
  Passed?: boolean | null;
}
export interface ChecklistStart {
  CompletionId: string;
  OccurrenceId?: string | null;
  DefinitionId?: string;
  VersionId?: string;
  TargetId?: string;
}
export interface ChecklistImage {
  id: string;
  itemId: string;
  name: string;
  contentType: string;
  base64: string;
}
export interface ChecklistDraft {
  id: string;
  scope: string;
  start: ChecklistStart;
  run: ChecklistRun;
  input: ChecklistInput;
  images: ChecklistImage[];
  queued: boolean;
  submit: boolean;
  error?: string;
}
