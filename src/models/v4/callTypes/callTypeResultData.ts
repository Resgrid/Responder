export class CallTypeResultData {
  public Id: string = '';
  public Name: string = '';
  /** What kind of call the type is (CallTypeClasses); -1 none, undefined from older servers. */
  public BaseType?: number;
}
