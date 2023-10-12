import { FilterResultData, PersonnelInfoResultData } from '@resgrid/ngx-resgridlib';
import { PersonnelFilterOption } from '../models/personnelFilterOption';

export interface PersonnelState {
    personnel: PersonnelInfoResultData[]
    personnelFilterOptions: PersonnelFilterOption[]
    personnelFilter: string

    viewPersonInfo: PersonnelInfoResultData;
}

export const initialState: PersonnelState = {
    personnel: null,
    personnelFilterOptions: null,
    personnelFilter: null,
    viewPersonInfo: null
};