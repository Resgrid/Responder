import { api } from '@/api/common/client';
import type { AddCreditInput, Certification, CertificationCredit, CertificationsResult, CertificationType, SaveCertificationInput } from '@/models/v4/certifications';

// v4 Certifications, self-service subset: the signed-in member's own records (userId omitted = self).

export const getMyCertifications = async () => (await api.get<CertificationsResult<Certification[]>>('/Certifications/GetUserCertifications')).data.Data;
export const getCertification = async (id: number) => (await api.get<CertificationsResult<Certification>>('/Certifications/GetCertification', { params: { id } })).data.Data;
/** The department's active catalog of person certifications. */
export const getPersonCertificationTypes = async () => (await api.get<CertificationsResult<CertificationType[]>>('/Certifications/GetCertificationTypes', { params: { appliesTo: 0 } })).data.Data;
// A scan rides as base64; allow a slower link than the default request timeout.
export const saveCertification = async (input: SaveCertificationInput) =>
  (await api.post<CertificationsResult<Certification>>('/Certifications/SaveCertification', { ...input, UserId: null }, { timeout: 60000 })).data.Data;
export const renewCertification = async (id: number, expiresOn: string | null, number: string | null) =>
  (await api.post<CertificationsResult<Certification>>('/Certifications/RenewCertification', { Id: id, ExpiresOn: expiresOn, Number: number })).data.Data;
export const deleteCertification = async (id: number) => (await api.delete<CertificationsResult<unknown>>('/Certifications/DeleteCertification', { params: { id } })).data;
export const getCertificationCredits = async (certificationId: number) =>
  (await api.get<CertificationsResult<CertificationCredit[]>>('/Certifications/GetCertificationCredits', { params: { certificationId } })).data.Data;
/** Answers with the certification's credits after the addition. */
export const addCertificationCredit = async (input: AddCreditInput) => (await api.post<CertificationsResult<CertificationCredit[]>>('/Certifications/AddCertificationCredit', input, { timeout: 60000 })).data.Data;
