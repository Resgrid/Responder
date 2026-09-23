// A member's own certifications (Workforce plan Phase D) as the v4 Certifications controller returns them.
// A member adds, edits, renews and removes their own records and logs continuing-education hours; status
// and verification are the department's to set. Dates are calendar days ("yyyy-MM-dd").

export const CertificationStatus = { Active: 0, Expired: 1, Suspended: 2, Revoked: 3, PendingVerification: 4, Trainee: 5 } as const;

export interface CertificationsResult<T> {
  Data: T;
  Status?: string;
}

export interface CertificationType {
  Id: number;
  Code: string;
  Name: string;
  Category: number;
  /** 0 person, 1 unit. */
  AppliesTo: number;
  Description?: string | null;
  IssuingAuthority?: string | null;
  DefaultValidityMonths?: number | null;
  NeverExpires: boolean;
  RenewalCreditHoursRequired?: number | null;
  RequiresVerification: boolean;
  IsActive: boolean;
}

export interface Certification {
  Id: number;
  UserId: string;
  TypeId?: number | null;
  TypeCode?: string | null;
  TypeName?: string | null;
  Name?: string | null;
  Number?: string | null;
  Type?: string | null;
  Area?: string | null;
  IssuedBy?: string | null;
  ExpiresOn?: string | null;
  ReceivedOn?: string | null;
  Status: number;
  StatusReason?: string | null;
  VerifiedOn?: string | null;
  DaysUntilExpiry?: number | null;
  HasFile: boolean;
  CreditHours: number;
  CreditHoursRequired?: number | null;
  IsProtected?: boolean;
}

export interface CertificationCredit {
  Id: number;
  CertificationId: number;
  CreditDate: string;
  Hours: number;
  Category?: string | null;
  Description?: string | null;
  HasFile: boolean;
}

export interface SaveCertificationInput {
  Id?: number | null;
  TypeId?: number | null;
  Name?: string | null;
  Number?: string | null;
  Type?: string | null;
  Area?: string | null;
  IssuedBy?: string | null;
  ExpiresOn?: string | null;
  ReceivedOn?: string | null;
  /** Card or certificate scan, base64; null keeps the stored file. */
  FileData?: string | null;
  FileName?: string | null;
  FileType?: string | null;
}

export interface AddCreditInput {
  CertificationId: number;
  /** Calendar day; null is today on the server. */
  CreditDate?: string | null;
  Hours: number;
  Category?: string | null;
  Description?: string | null;
  FileData?: string | null;
  FileName?: string | null;
  FileType?: string | null;
}
