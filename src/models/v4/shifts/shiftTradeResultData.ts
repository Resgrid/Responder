export class ShiftTradeOfferedShiftResultData {
  public ShiftSignupId: string = '';
  public ShiftName: string = '';
  public ShiftDay: string = '';
}

export class ShiftTradeUserResultData {
  public UserId: string = '';
  public Name: string = '';
  public Declined: boolean = false;
  public Offered: boolean = false;
  public Reason: string = '';
  /** Days offered as a swap-back; empty means they offered to just take the shift. */
  public OfferedShifts: ShiftTradeOfferedShiftResultData[] = [];
}

export class ShiftTradeResultData {
  public ShiftSignupTradeId: string = '';
  /** `ShiftTradeDirection` */
  public Direction: number = 0;
  /** `ShiftTradeStatus` */
  public Status: number = 0;
  /** `ShiftTradeUserState`; meaningful for incoming trades. */
  public MyState: number = 0;
  public SourceShiftSignupId: string = '';
  public SourceUserId: string = '';
  public SourceUserName: string = '';
  public ShiftId: string = '';
  public ShiftName: string = '';
  public ShiftDayId: string = '';
  public ShiftDay: string = '';
  public Start: string = '';
  public End: string = '';
  public GroupId: string = '';
  public GroupName: string = '';
  /** The requester's note. */
  public Note: string = '';
  public Users: ShiftTradeUserResultData[] = [];
  public AcceptedUserId: string = '';
  public AcceptedUserName: string = '';
  /** '' for a straight give-away. */
  public TargetShiftSignupId: string = '';
  public TargetShiftDay: string = '';
  public ReviewNote: string = '';
  public ReviewedByName: string = '';
  public RequireApproval: boolean = false;
  /** The caller may approve or deny it, and it is pending. */
  public CanReview: boolean = false;
}
