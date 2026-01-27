/**
 * Role-Based Firestore Query Utilities
 */

import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc,
  orderBy,
  QueryConstraint
} from 'firebase/firestore';
import { initFirebase } from '@/lib/firebase';
import { UserRole, UserProfile, Hospital, Patient } from '@/lib/rbac';

const { db } = initFirebase();

export const getPatientsByRole = async (userProfile: UserProfile): Promise<Patient[]> => {
  try {
    const patientsRef = collection(db, 'patients');
    let queryConstraints: QueryConstraint[] = [];

    switch (userProfile.role) {
      case UserRole.SUPER_ADMIN:
        queryConstraints = [orderBy('createdAt', 'desc')];
        break;
      case UserRole.STATE_ADMIN:
        if (!userProfile.state) throw new Error('State admin must have a state assigned');
        queryConstraints = [where('state', '==', userProfile.state), orderBy('createdAt', 'desc')];
        break;
      case UserRole.HOSPITAL_ADMIN:
        if (!userProfile.hospitalId) throw new Error('Hospital admin must have a hospital assigned');
        queryConstraints = [where('hospitalId', '==', userProfile.hospitalId), orderBy('createdAt', 'desc')];
        break;
      case UserRole.CLINICIAN:
        queryConstraints = [where('assignedDoctorId', '==', userProfile.uid), orderBy('createdAt', 'desc')];
        break;
      default:
        throw new Error('Invalid role');
    }

    const q = query(patientsRef, ...queryConstraints);
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      admissionDate: doc.data().admissionDate?.toDate() || new Date(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date()
    } as Patient));
  } catch (error) {
    console.error('Error fetching patients:', error);
    throw error;
  }
};

export const getHospitalsByRole = async (userProfile: UserProfile): Promise<Hospital[]> => {
  try {
    const hospitalsRef = collection(db, 'hospitals');
    let queryConstraints: QueryConstraint[] = [];

    switch (userProfile.role) {
      case UserRole.SUPER_ADMIN:
        queryConstraints = [orderBy('name', 'asc')];
        break;
      case UserRole.STATE_ADMIN:
        if (!userProfile.state) throw new Error('State admin must have a state assigned');
        queryConstraints = [where('state', '==', userProfile.state), orderBy('name', 'asc')];
        break;
      case UserRole.HOSPITAL_ADMIN:
      case UserRole.CLINICIAN:
        if (!userProfile.hospitalId) throw new Error('Must have a hospital assigned');
        queryConstraints = [where('__name__', '==', userProfile.hospitalId)];
        break;
      default:
        throw new Error('Invalid role');
    }

    const q = query(hospitalsRef, ...queryConstraints);
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date()
    } as Hospital));
  } catch (error) {
    console.error('Error fetching hospitals:', error);
    throw error;
  }
};

export const getDoctorsByRole = async (userProfile: UserProfile): Promise<UserProfile[]> => {
  try {
    const usersRef = collection(db, 'users');
    let queryConstraints: QueryConstraint[] = [];

    switch (userProfile.role) {
      case UserRole.SUPER_ADMIN:
        queryConstraints = [where('role', '==', UserRole.CLINICIAN), orderBy('name', 'asc')];
        break;
      case UserRole.STATE_ADMIN:
        if (!userProfile.state) throw new Error('State admin must have a state assigned');
        queryConstraints = [
          where('role', '==', UserRole.CLINICIAN),
          where('state', '==', userProfile.state),
          orderBy('name', 'asc')
        ];
        break;
      case UserRole.HOSPITAL_ADMIN:
        if (!userProfile.hospitalId) throw new Error('Hospital admin must have a hospital assigned');
        queryConstraints = [
          where('role', '==', UserRole.CLINICIAN),
          where('hospitalId', '==', userProfile.hospitalId),
          orderBy('name', 'asc')
        ];
        break;
      case UserRole.CLINICIAN:
        return [];
      default:
        throw new Error('Invalid role');
    }

    const q = query(usersRef, ...queryConstraints);
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      uid: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date()
    } as UserProfile));
  } catch (error) {
    console.error('Error fetching doctors:', error);
    throw error;
  }
};

export const getDashboardStats = async (userProfile: UserProfile) => {
  try {
    const [patients, hospitals, doctors] = await Promise.all([
      getPatientsByRole(userProfile),
      getHospitalsByRole(userProfile),
      getDoctorsByRole(userProfile)
    ]);

    return {
      totalPatients: patients.length,
      criticalPatients: patients.filter(p => p.status === 'critical' || p.riskScore >= 0.7).length,
      totalHospitals: hospitals.length,
      totalDoctors: doctors.length
    };
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    throw error;
  }
};
