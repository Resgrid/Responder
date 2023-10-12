import { CallExtraDataResultData, CallFileResultData, CallNoteResultData, CallPriorityResultData, CallResultData, RecipientsResultData } from '@resgrid/ngx-resgridlib';
import { GeoLocation } from 'src/app/models/geoLocation';
import { CallAndPriorityData } from '../models/callAndPriorityData';

export interface CallsState {
    activeCalls: CallAndPriorityData[];

    callToView: CallResultData;
    callViewData: CallExtraDataResultData;
    callToViewPriority: CallPriorityResultData;

    viewCallType: string;
    callNotes: CallNoteResultData[];
    callImages: CallFileResultData[];
    callFiles: CallFileResultData[];

    newCallLocation: GeoLocation;
    newCallWhoDispatch: RecipientsResultData[];

    editCallLocation: GeoLocation;
    editCallWhoDispatch: RecipientsResultData[];

    setLocationModalForNewCall: boolean;
    setLocationModalLocation: GeoLocation;
}

export const initialState: CallsState = {
    activeCalls: null,
    callToView: null,
    callViewData: null,
    callToViewPriority: null,
    viewCallType: 'call',
    callNotes: null,
    callImages: null,
    callFiles: null,
    newCallLocation: null,
    newCallWhoDispatch: null,
    editCallLocation: null,
    editCallWhoDispatch: null,
    setLocationModalForNewCall: false,
    setLocationModalLocation: null
};