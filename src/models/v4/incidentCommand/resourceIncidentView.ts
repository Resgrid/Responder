export interface IncidentContactInfo {
  UserId?: string | null;
  Name: string;
  Phone?: string | null;
  Email?: string | null;
}

export interface TacticalObjective {
  TacticalObjectiveId: string;
  IncidentCommandId: string;
  DepartmentId: number;
  CallId: number;
  Name: string;
  ObjectiveType: number;
  Status: number;
  AutoPopulated: boolean;
  CompletedByUserId?: string | null;
  CompletedOn?: string | null;
  Description?: string | null;
  ProgressPercent: number;
  Priority: number;
  TargetCompleteOn?: string | null;
  SortOrder: number;
  ModifiedOn?: string | null;
}

export interface IncidentNeed {
  IncidentNeedId: string;
  IncidentCommandId: string;
  DepartmentId: number;
  CallId: number;
  Name: string;
  Description?: string | null;
  Category: number;
  Status: number;
  QuantityRequested: number;
  QuantityFulfilled: number;
  Priority: number;
  CreatedByUserId?: string | null;
  CreatedOn: string;
  MetByUserId?: string | null;
  MetOn?: string | null;
  SortOrder: number;
  ModifiedOn?: string | null;
}

export interface IncidentNote {
  IncidentNoteId: string;
  IncidentCommandId: string;
  DepartmentId: number;
  CallId: number;
  NoteType: number;
  Visibility: number;
  Title?: string | null;
  Body: string;
  ContainmentPercent?: number | null;
  CreatedByUserId: string;
  CreatedOn: string;
  DeletedOn?: string | null;
  ModifiedOn?: string | null;
}

export interface IncidentAttachment {
  IncidentAttachmentId: string;
  IncidentCommandId: string;
  DepartmentId: number;
  CallId: number;
  Visibility: number;
  FileName: string;
  ContentType: string;
  ContentLength: number;
  Description?: string | null;
  UploadedByUserId: string;
  UploadedOn: string;
  DeletedOn?: string | null;
  ModifiedOn?: string | null;
}

export interface ResourceLaneAssignmentView {
  ResourceAssignmentId: string;
  CommandStructureNodeId: string;
  LaneName: string;
  NodeType: number;
  Color?: string | null;
  AssignedOn: string;
  PrimaryLead?: IncidentContactInfo | null;
  SecondaryLead?: IncidentContactInfo | null;
  PrimaryObjective?: TacticalObjective | null;
  SecondaryObjective?: TacticalObjective | null;
  LinkedNeed?: IncidentNeed | null;
}

export interface ResourceIncidentView {
  IncidentCommandId: string;
  CallId: number;
  Status: number;
  EstablishedOn: string;
  EstimatedEndOn?: string | null;
  ClosedOn?: string | null;
  ImportantInformation?: string | null;
  IncidentActionPlan?: string | null;
  Commander?: IncidentContactInfo | null;
  Objectives: TacticalObjective[];
  Needs: IncidentNeed[];
  Notes: IncidentNote[];
  Attachments: IncidentAttachment[];
  MyAssignment?: ResourceLaneAssignmentView | null;
}
