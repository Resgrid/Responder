import { StatusesResultData } from '@resgrid/ngx-resgridlib';
import { SetPersonStaffingPayload } from '../models/setPersonStaffingPayload';
import { SetPersonStatusPayload } from '../models/setPersonStatusPayload';
import { StatusDestination } from "../models/statusDestination";


export interface StatusesState {
    submittingPersonStatus: StatusesResultData;
    //submittingPersonStatusUnitId: string;
    submittingPersonStatusModalDisplay: number;
    submitStatusDestinations: StatusDestination[];
    submittingPersonStatusNote: string;
    submitStatusDestination: StatusDestination;
    pendingSetPersonStatus: SetPersonStatusPayload;



    submittingPersonStaffingNote: string;
    submittingPersonStaffing: StatusesResultData;
    pendingSetPersonStaffing: SetPersonStaffingPayload;
}

export const initialState: StatusesState = {
    submittingPersonStatus: null,
    //submittingUnitStatusUnitId: null,
    submittingPersonStatusModalDisplay: 0,
    submitStatusDestinations: null,
    submittingPersonStatusNote: null,
    submitStatusDestination: null,
    pendingSetPersonStatus: null,
    pendingSetPersonStaffing: null,
    submittingPersonStaffing: null,
    submittingPersonStaffingNote: null,
};