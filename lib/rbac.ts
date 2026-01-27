/**
 * Role-Based Access Control (RBAC) System
 * Defines roles, permissions, and utilities for access control
 */

// ============================================
// ROLE TYPES
// ============================================

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  STATE_ADMIN = 'STATE_ADMIN',
  HOSPITAL_ADMIN = 'HOSPITAL_ADMIN',
  CLINICIAN = 'CLINICIAN'
}

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface UserProfile {
  uid: string;
  role: UserRole;
  name: string;
  email: string;
  designation: string;
  state?: string; // Required for STATE_ADMIN
  hospitalId?: string; // Required for HOSPITAL_ADMIN and CLINICIAN
  createdAt: Date;
  updatedAt: Date;
}

export interface Hospital {
  id: string;
  name: string;
  state: string;
  address: string;
  contactNumber: string;
  totalBeds: number;
  nicuBeds: number;
  createdAt: Date;
}

export interface Patient {
  id: string;
  name: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  hospitalId: string;
  assignedDoctorId: string;
  riskScore: number;
  status: 'critical' | 'high-risk' | 'moderate' | 'stable';
  admissionDate: Date;
  state: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// ROUTE MAPPINGS
// ============================================

export const ROLE_ROUTES: Record<UserRole, string> = {
  [UserRole.SUPER_ADMIN]: '/dashboard/national',
  [UserRole.STATE_ADMIN]: '/dashboard/state',
  [UserRole.HOSPITAL_ADMIN]: '/dashboard/hospital',
  [UserRole.CLINICIAN]: '/dashboard/clinician'
};

// ============================================
// PERMISSION CHECKERS
// ============================================

export const canAccessAllStates = (role: UserRole): boolean => {
  return role === UserRole.SUPER_ADMIN;
};

export const canAccessState = (role: UserRole, userState?: string, targetState?: string): boolean => {
  if (role === UserRole.SUPER_ADMIN) return true;
  if (role === UserRole.STATE_ADMIN && userState === targetState) return true;
  return false;
};

export const canAccessHospital = (
  role: UserRole,
  userState?: string,
  userHospitalId?: string,
  targetHospital?: { state: string; id: string }
): boolean => {
  if (role === UserRole.SUPER_ADMIN) return true;
  if (role === UserRole.STATE_ADMIN && userState === targetHospital?.state) return true;
  if (role === UserRole.HOSPITAL_ADMIN && userHospitalId === targetHospital?.id) return true;
  return false;
};

export const canAccessPatient = (
  role: UserRole,
  userId: string,
  userState?: string,
  userHospitalId?: string,
  patient?: { state: string; hospitalId: string; assignedDoctorId: string }
): boolean => {
  if (role === UserRole.SUPER_ADMIN) return true;
  if (role === UserRole.STATE_ADMIN && userState === patient?.state) return true;
  if (role === UserRole.HOSPITAL_ADMIN && userHospitalId === patient?.hospitalId) return true;
  if (role === UserRole.CLINICIAN && userId === patient?.assignedDoctorId) return true;
  return false;
};

export const getRedirectRoute = (userRole: UserRole): string => {
  return ROLE_ROUTES[userRole];
};
