import { ActiveUnitRoleResultData, CallPriorityResultData, CallResultData, CallTypeResultData, DepartmentRightsResult, GetConfigResultData, GetCurrentStaffingResultData, GetCurrentStatusResultData, GroupResultData, MapDataAndMarkersData, StatusesResultData, UnitResultData, UnitStatusResultData, UnitTypeStatusResultData } from '@resgrid/ngx-resgridlib';
import { GeoLocation } from "src/app/models/geoLocation";
import { PushData } from "src/app/models/pushData";

export interface HomeState {

    activeStatuses: StatusesResultData[];
    activeStaffing: StatusesResultData[];

    currentStatus: GetCurrentStatusResultData;
    currentStatusValue: StatusesResultData;
    currentStaffing: GetCurrentStaffingResultData;
    currentStaffingValue: StatusesResultData;

    pushData: PushData;

    config: GetConfigResultData;

    currentPositionTimestamp: Date;
    currentPosition: GeoLocation;

    // App Data
    isMobileApp: boolean;
    units: UnitResultData[];
    calls: CallResultData[];
    callPriorties: CallPriorityResultData[];
    callTypes: CallTypeResultData[];
    unitStatuses: UnitTypeStatusResultData[];
    unitRoleAssignments: ActiveUnitRoleResultData[];
    groups: GroupResultData[];
    rights: DepartmentRightsResult;
}

export const initialState: HomeState = {
    activeStatuses: [],
    activeStaffing: [],
    units: [],
    calls: [],
    callPriorties: [],
    callTypes: [],
    unitStatuses: [],
    unitRoleAssignments: [],
    groups: [],
    currentStatus: null,
    currentStaffing: null,
    pushData: null,
    currentStatusValue: null,
    currentStaffingValue: null,
    config: null,
    currentPositionTimestamp: null,
    currentPosition: null,
    rights: null,
    isMobileApp: false
};
