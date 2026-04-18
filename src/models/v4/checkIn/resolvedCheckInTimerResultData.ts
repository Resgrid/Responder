export class ResolvedCheckInTimerResultData {
  public TargetType: number = 0;
  public TargetTypeName: string = '';
  public UnitTypeId: number | null = null;
  public TargetEntityId: string = '';
  public TargetName: string = '';
  public DurationMinutes: number = 0;
  public WarningThresholdMinutes: number = 0;
  public IsFromOverride: boolean = false;
  public ActiveForStates: string = '';
}
