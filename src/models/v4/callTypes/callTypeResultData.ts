export class CallTypeResultData {
  public Id: string = '';
  public Name: string = '';
  /** What kind of call the type is (CallTypeClasses); -1 none, undefined from older servers. */
  public BaseType?: number;
  /** Department-uploaded icon for the type (absolute URL); null when none, undefined from older servers. */
  public IconUrl?: string | null;
  /** Built-in icon the type picked (lowercase `MAP_ICONS` key); null when none, undefined from older servers. */
  public MapIcon?: string | null;
}
