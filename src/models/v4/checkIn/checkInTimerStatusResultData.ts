export class CheckInTimerStatusResultData {
  public TargetType: number = 0;
  public TargetTypeName: string = '';
  public TargetEntityId: string = '';
  public TargetName: string = '';
  public UnitId: number | null = null;
  public LastCheckIn: string | null = null;
  public DurationMinutes: number = 0;
  public WarningThresholdMinutes: number = 0;
  public ElapsedMinutes: number = 0;
  public Status: string = '';
}
