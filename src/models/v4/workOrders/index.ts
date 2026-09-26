// Work orders (Readiness Pro maintenance) as the v4 WorkOrders controller returns them. A member reports a
// problem (a new order starts Requested), sees the orders they created or that are assigned to them or their
// roles, and works an assigned order: accept, move it along, comment, log hours and attach photos. Every
// command answers with the whole detail and bumps Revision; a stale Revision is refused with 409.

export const WorkOrderStatus = { Requested: 0, Accepted: 1, Assigned: 2, InProgress: 3, OnHold: 4, Completed: 5, Closed: 6, Rejected: 7, Duplicate: 8, Cancelled: 9 } as const;
export const WorkOrderPriority = { Low: 0, Normal: 1, High: 2, Emergency: 3 } as const;
export const WorkOrderType = { Corrective: 0, Preventive: 1, Inspection: 2, Facility: 3, Other: 4 } as const;
export const WorkOrderActivityType = {
  Created: 0,
  Updated: 1,
  StatusChanged: 2,
  Assigned: 3,
  AssignmentAccepted: 4,
  Comment: 5,
  LaborAdded: 6,
  PartAdded: 7,
  PartVoided: 8,
  FileAdded: 9,
  FileWithdrawn: 10,
  SafetyHold: 11,
  SafetyReleased: 12,
  Deferred: 13,
  Escalated: 14,
} as const;

export interface WorkOrderApiResult<T> {
  Data: T;
  HasMore?: boolean;
  Status?: string;
}

export interface ReadinessAccess {
  ChecklistsEnabled: boolean;
  /** Readiness Pro maintenance: needed to report, update and work orders (reads do not need it). */
  MaintenanceEnabled: boolean;
  ProductName?: string | null;
}

export interface WorkOrderTaskStep {
  Text: string;
  Completed: boolean;
}

export interface WorkOrderContent {
  Title: string;
  Description?: string | null;
  LocationText?: string | null;
  Currency?: string | null;
  SafetyCritical?: boolean;
  HazardousWork?: boolean;
  Resolution?: string | null;
  Cause?: string | null;
  VerificationEvidence?: string | null;
  Steps: WorkOrderTaskStep[];
}

export interface WorkOrderInput {
  /** Idempotency key (GUID, "D" format); a retried create returns the same order. */
  RequestId: string;
  Revision: number;
  Type: number;
  Priority: number;
  TargetUnitId?: number | null;
  TargetGroupId?: number | null;
  InventoryAssetId?: string | null;
  DueOn?: string | null;
  Content: WorkOrderContent;
}

export interface WorkOrderSummary {
  Id: string;
  Number: string;
  Title: string;
  Status: number;
  Priority: number;
  Revision: number;
  UpdatedOn: string;
  CreatedOn: string;
  DueOn?: string | null;
  AssignedToUserId?: string | null;
  AssignedToRoleId?: number | null;
  AssignedToUserIds?: string[];
  AssignedToRoleIds?: number[];
  UnitId?: number | null;
  GroupId?: number | null;
  AssetId?: string | null;
}

export interface WorkOrderPage {
  Items: WorkOrderSummary[];
  HasMore: boolean;
  /** The Readiness Pro write gate for this department and person. */
  CanWrite: boolean;
}

export interface WorkOrderActivity {
  Id: string;
  Type: number;
  UserId?: string | null;
  CreatedOn: string;
  Note?: string | null;
  OldStatus?: number | null;
  NewStatus?: number | null;
}

export interface WorkOrderLabor {
  Id: string;
  UserId?: string | null;
  WorkDate: string;
  Content: { Hours: number; Note?: string | null; Currency?: string | null };
}

export interface WorkOrderFile {
  Id: string;
  Name: string;
  ContentType: string;
  Size: number;
  WithdrawnOn?: string | null;
}

export interface WorkOrderDetail {
  Order: WorkOrderSummary;
  Input: WorkOrderInput;
  CanWrite: boolean;
  CanManage: boolean;
  CanEdit: boolean;
  CanContribute: boolean;
  CanAccept: boolean;
  /** The statuses this person may move the order to right now (already filtered by the server). */
  Transitions: number[];
  ReportedBy?: string | null;
  ResponseDueOn?: string | null;
  RepairDueOn?: string | null;
  CompletedOn?: string | null;
  Activities: WorkOrderActivity[];
  Labor: WorkOrderLabor[];
  Files: WorkOrderFile[];
}

export interface WorkOrderChoice {
  Id: string;
  Name: string;
}

export interface WorkOrderChoices {
  Currency: string;
  Users: WorkOrderChoice[];
  Roles: WorkOrderChoice[];
  Units: WorkOrderChoice[];
  Groups: WorkOrderChoice[];
  Assets: WorkOrderChoice[];
}

export interface WorkOrderTransition {
  Revision: number;
  Status: number;
  Reason?: string | null;
  DuplicateOfId?: string | null;
  Resolution?: string | null;
  Cause?: string | null;
  VerificationEvidence?: string | null;
  ConfirmTasksComplete?: boolean;
}

export interface WorkOrderFilter {
  page?: number;
  status?: number | null;
  assignedToMe?: boolean;
}
