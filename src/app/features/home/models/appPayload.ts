import { CallPriorityResultData, CallResultData, CallTypeResultData, DepartmentRightsResult, FormResultData, GetConfigResultData, GetCurrentStaffingResultData, GetCurrentStatusResultData, GetPersonnelForCallGridResultData, GetRolesForCallGridResultData, GroupResultData, StatusesResultData, UnitResultData, UnitStatusResultData, UnitTypeStatusResultData } from '@resgrid/ngx-resgridlib';
import { ActiveUnitRoleResultData } from '@resgrid/ngx-resgridlib/lib/models/v4/unitRoles/activeUnitRoleResultData';

export class AppPayload {
    //public Units: UnitResultData[];
    public Calls: CallResultData[];
    public CallPriorties: CallPriorityResultData[];
    public CallTypes: CallTypeResultData[];
    public CurrentStatus: GetCurrentStatusResultData;
    public CurrentStaffing: GetCurrentStaffingResultData;
    public PersonnelStatuses: StatusesResultData[];
    public PersonnelStaffing: StatusesResultData[];
    public Groups: GroupResultData[];
    public IsMobileApp: boolean = false;
    public Config: GetConfigResultData;
    public Rights: DepartmentRightsResult;
}
