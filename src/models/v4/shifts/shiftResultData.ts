import { type ShiftDayResultData } from './shiftDayResultData';

export class ShiftGroupRoleResultData {
  public RoleId: string = '';
  public RoleName: string = '';
  public Required: number = 0;
}

export class ShiftGroupResultData {
  public GroupId: string = '';
  public GroupName: string = '';
  public Roles: ShiftGroupRoleResultData[] = [];
}

export class ShiftResultData {
  public ShiftId: string = '';
  public Name: string = '';
  public Code: string = '';
  public Color: string = '';
  /** `ShiftScheduleType` */
  public ScheduleType: number = 0;
  /** `ShiftAssignmentType` */
  public AssignmentType: number = 0;
  /** The caller is on the standing roster. */
  public InShift: boolean = false;
  public PersonnelCount: number = 0;
  public GroupCount: number = 0;
  public NextDay: string = '';
  public NextDayId: string = '';
  /** As entered by the department, e.g. "7:00 AM" or "19:00". */
  public StartTime: string = '';
  public EndTime: string = '';
  /** Sign-ups and trades need supervisor approval. */
  public RequireApproval: boolean = false;
  /** The caller may supervise at least one group on this shift. */
  public CanManage: boolean = false;
  public Groups: ShiftGroupResultData[] = [];

  /** Light entries (no Roster / Needs). */
  public Days: ShiftDayResultData[] = [];
}
