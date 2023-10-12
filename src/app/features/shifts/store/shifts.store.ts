import { ShiftDaysResultData, ShiftResultData } from "@resgrid/ngx-resgridlib";


export interface ShiftsState {
    todayShifts: ShiftDaysResultData[];
    shifts: ShiftResultData[];
    viewShift: ShiftResultData;
    viewShiftDay: ShiftDaysResultData;
}

export const initialState: ShiftsState = {
    todayShifts: [],
    shifts: null,
    viewShift: null,
    viewShiftDay: null
};