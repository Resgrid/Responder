import { UnitInfoResultData } from "@resgrid/ngx-resgridlib";
import { UnitFilterOption } from "../models/unitFilterOption";


export interface UnitsState {
    units: UnitInfoResultData[]
    unitFilterOptions: UnitFilterOption[]
    unitFilter: string

    viewUnitInfo: UnitInfoResultData;
}

export const initialState: UnitsState = {
    units: null,
    unitFilterOptions: null,
    unitFilter: null,
    viewUnitInfo: null
};