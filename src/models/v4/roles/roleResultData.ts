export class RoleResultData {
  public RoleId: string = '';
  public Name: string = '';
  /** Department-uploaded role icon (128 px square PNG, anonymous GET, immutable); null/undefined when none or from older servers. */
  public IconUrl?: string | null;
  /** Position in the department's role order (lowest first, ties by name); 0 until ordered, undefined from older servers. */
  public SortOrder?: number;
}
