export class SetPersonStatusPayload {
    public userId: string;
    public stateType: string;
    public destination: string;
    public destinationType: number;
    public note: string;
    public date: Date;
}
