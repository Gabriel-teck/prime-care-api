export const ROLE_API = {
  PATIENT: 'patient',
  DOCTOR: 'doctor',
  ADMIN: 'admin',
} as const;

export type ApiRole = (typeof ROLE_API)[keyof typeof ROLE_API];

export function toApiRole(role: string): ApiRole {
  return role.toLowerCase() as ApiRole;
}
