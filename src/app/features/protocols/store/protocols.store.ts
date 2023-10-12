import { CallProtocolsResultData } from "@resgrid/ngx-resgridlib";

export interface ProtocolsState {
    protocols: CallProtocolsResultData[];
    viewprotocol: CallProtocolsResultData;
}

export const initialState: ProtocolsState = {
    protocols: null,
    viewprotocol: null
};