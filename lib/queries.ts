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
  updateDoc,
  orderBy,
  limit,
  QueryConstraint,
  serverTimestamp
} from 'firebase/firestore';
import { initFirebase } from '@/lib/firebase';
import { UserRole, UserProfile, Hospital, Patient } from '@/lib/rbac';
import { demoHospitals, demoDoctors, demoPatients, demoDiagnoses, getDemoStats } from '@/lib/demo-data';

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

    console.log('Fetching patients for role:', userProfile.role, 'constraints:', queryConstraints.length);
    const q = query(patientsRef, ...queryConstraints, limit(500));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      admissionDate: doc.data().admissionDate?.toDate() || new Date(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date()
    } as Patient));
  } catch (error: any) {
    console.error('Firebase error fetching patients:', error.message, error.code, error);
    // If it's an index error, provide helpful message
    if (error.code === 'failed-precondition' || error.message?.includes('index')) {
      console.error('FIRESTORE INDEX REQUIRED - Check the console for the index creation link');
    }
    return [];
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
        queryConstraints = [where('state', '==', userProfile.state)];
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

    // Sort in memory to avoid needing composite indexes
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date()
    } as Hospital)).sort((a, b) => a.name.localeCompare(b.name));
  } catch (error: any) {
    console.error('Firebase error fetching hospitals:', error.message);
    return [];
  }
};

export const getDoctorsByRole = async (userProfile: UserProfile): Promise<UserProfile[]> => {
  try {
    const usersRef = collection(db, 'users');
    let queryConstraints: QueryConstraint[] = [];

    switch (userProfile.role) {
      case UserRole.SUPER_ADMIN:
        queryConstraints = [where('role', '==', UserRole.CLINICIAN)];
        break;
      case UserRole.STATE_ADMIN:
        if (!userProfile.state) throw new Error('State admin must have a state assigned');
        queryConstraints = [
          where('role', '==', UserRole.CLINICIAN),
          where('state', '==', userProfile.state)
        ];
        break;
      case UserRole.HOSPITAL_ADMIN:
        if (!userProfile.hospitalId) throw new Error('Hospital admin must have a hospital assigned');
        queryConstraints = [
          where('role', '==', UserRole.CLINICIAN),
          where('hospitalId', '==', userProfile.hospitalId)
        ];
        break;
      case UserRole.CLINICIAN:
        return [];
      default:
        throw new Error('Invalid role');
    }

    const q = query(usersRef, ...queryConstraints);
    const snapshot = await getDocs(q);

    // Sort in memory to avoid needing composite indexes
    return snapshot.docs.map(doc => ({
      uid: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date()
    } as UserProfile)).sort((a, b) => a.name.localeCompare(b.name));
  } catch (error: any) {
    console.error('Firebase error fetching doctors:', error.message);
    return [];
  }
};

export const getDashboardStats = async (userProfile: UserProfile) => {
  try {
    const [patients, hospitals, doctors] = await Promise.all([
      getPatientsByRole(userProfile),
      getHospitalsByRole(userProfile),
      getDoctorsByRole(userProfile)
    ]);

    // Calculate bed capacity statistics
    const totalBeds = hospitals.reduce((sum, h) => sum + (h.totalBeds || 0), 0);
    const totalNicuBeds = hospitals.reduce((sum, h) => sum + (h.nicuBeds || 0), 0);
    const occupiedBeds = patients.length; // Assuming 1 patient = 1 bed occupied
    const bedOccupancyRate = totalBeds > 0 ? parseFloat((occupiedBeds / totalBeds * 100).toFixed(1)) : 0;

    return {
      totalPatients: patients.length,
      criticalPatients: patients.filter(p => p.status === 'critical' || p.riskScore >= 0.7).length,
      totalHospitals: hospitals.length,
      totalDoctors: doctors.length,
      totalBeds: totalBeds,
      totalNicuBeds: totalNicuBeds,
      occupiedBeds: occupiedBeds,
      bedOccupancyRate: bedOccupancyRate
    };
  } catch (error: any) {
    console.error('Firebase error fetching stats:', error.message);
    return {
      totalPatients: 0,
      criticalPatients: 0,
      totalHospitals: 0,
      totalDoctors: 0,
      totalBeds: 0,
      totalNicuBeds: 0,
      occupiedBeds: 0,
      bedOccupancyRate: 0
    };
  }
};

export interface Diagnosis {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  hospitalId: string;
  state: string;
  diagnosisType: string;
  severity: string;
  diagnosisSummary: string;
  detailedNotes: string;
  neonatalMetrics?: {
    heartRate?: number;
    respiratoryRate?: number;
    temperature?: number;
    oxygenSaturation?: number;
    bloodPressure?: string;
    weight?: number;
  };
  labResults?: {
    wbcCount?: number;
    cReactiveProtein?: number;
    procalcitonin?: number;
    bloodCulture?: string;
  };
  treatmentPlan: string;
  prescriptions?: string[];
  status: string;
  outcome?: string;
  diagnosisDate: Date;
  createdAt: Date;
  updatedAt?: Date;
  mlPrediction?: {
    riskScore: number;
    prediction: string;
    confidence: number;
  };
}

export const getDiagnosesByRole = async (userProfile: UserProfile): Promise<Diagnosis[]> => {
  try {
    const diagnosesRef = collection(db, 'diagnoses');
    let queryConstraints: QueryConstraint[] = [];

    switch (userProfile.role) {
      case UserRole.SUPER_ADMIN:
        queryConstraints = [orderBy('diagnosisDate', 'desc')];
        break;
      case UserRole.STATE_ADMIN:
        if (!userProfile.state) throw new Error('State admin must have a state assigned');
        queryConstraints = [where('state', '==', userProfile.state), orderBy('diagnosisDate', 'desc')];
        break;
      case UserRole.HOSPITAL_ADMIN:
        if (!userProfile.hospitalId) throw new Error('Hospital admin must have a hospital assigned');
        queryConstraints = [where('hospitalId', '==', userProfile.hospitalId), orderBy('diagnosisDate', 'desc')];
        break;
      case UserRole.CLINICIAN:
        queryConstraints = [where('doctorId', '==', userProfile.uid), orderBy('diagnosisDate', 'desc')];
        break;
      default:
        throw new Error('Invalid role');
    }

    const q = query(diagnosesRef, ...queryConstraints);
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      diagnosisDate: doc.data().diagnosisDate?.toDate() || new Date(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date()
    } as Diagnosis));
  } catch (error: any) {
    console.error('Firebase error fetching diagnoses:', error.message);
    return [];
  }
};

export const downloadDiagnosisData = (diagnoses: Diagnosis[], format: 'csv' | 'json' = 'csv') => {
  if (format === 'json') {
    const dataStr = JSON.stringify(diagnoses, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `diagnoses_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  } else {
    const headers = [
      'ID', 'Patient Name', 'Doctor Name', 'Hospital ID', 'State', 
      'Diagnosis Type', 'Severity', 'Summary', 'Detailed Notes',
      'Heart Rate', 'Respiratory Rate', 'Temperature', 'O2 Saturation',
      'WBC Count', 'C-Reactive Protein', 'Blood Culture',
      'Treatment Plan', 'Prescriptions', 'Status', 'Outcome',
      'ML Risk Score', 'ML Prediction', 'ML Confidence',
      'Diagnosis Date', 'Created At'
    ];
    
    const rows = diagnoses.map(d => [
      d.id,
      d.patientName,
      d.doctorName,
      d.hospitalId,
      d.state,
      d.diagnosisType,
      d.severity,
      `"${d.diagnosisSummary?.replace(/"/g, '""') || ''}"`,
      `"${d.detailedNotes?.replace(/"/g, '""') || ''}"`,
      d.neonatalMetrics?.heartRate || '',
      d.neonatalMetrics?.respiratoryRate || '',
      d.neonatalMetrics?.temperature || '',
      d.neonatalMetrics?.oxygenSaturation || '',
      d.labResults?.wbcCount || '',
      d.labResults?.cReactiveProtein || '',
      d.labResults?.bloodCulture || '',
      `"${d.treatmentPlan?.replace(/"/g, '""') || ''}"`,
      `"${d.prescriptions?.join('; ') || ''}"`,
      d.status,
      d.outcome || '',
      d.mlPrediction?.riskScore || '',
      d.mlPrediction?.prediction || '',
      d.mlPrediction?.confidence || '',
      d.diagnosisDate?.toISOString() || '',
      d.createdAt?.toISOString() || ''
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const dataBlob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `diagnoses_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }
};

export const downloadPatientData = (patients: Patient[], format: 'csv' | 'json' = 'csv') => {
  if (format === 'json') {
    const dataStr = JSON.stringify(patients, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `patients_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  } else {
    const headers = [
      'ID', 'Name', 'Age (days)', 'State', 'Hospital ID', 
      'Assigned Doctor ID', 'Risk Score', 'Status', 'Created At'
    ];
    
    const rows = patients.map(p => [
      p.id,
      p.name,
      p.age,
      p.state,
      p.hospitalId,
      p.assignedDoctorId,
      p.riskScore,
      p.status,
      p.createdAt?.toISOString() || ''
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const dataBlob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `patients_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }
};

// Download combined patient data with their diagnoses
export const downloadPatientDataWithDiagnosis = async (
  userProfile: UserProfile, 
  format: 'csv' | 'json' = 'csv'
) => {
  try {
    const [patients, diagnoses] = await Promise.all([
      getPatientsByRole(userProfile),
      getDiagnosesByRole(userProfile)
    ]);

    // Create a map of patient ID to their diagnoses
    const patientDiagnosesMap = new Map<string, Diagnosis[]>();
    diagnoses.forEach(diagnosis => {
      if (!patientDiagnosesMap.has(diagnosis.patientId)) {
        patientDiagnosesMap.set(diagnosis.patientId, []);
      }
      patientDiagnosesMap.get(diagnosis.patientId)!.push(diagnosis);
    });

    // Combine patient data with diagnoses
    const combinedData = patients.map(patient => {
      const patientDiagnoses = patientDiagnosesMap.get(patient.id) || [];
      return {
        patient,
        diagnoses: patientDiagnoses,
        diagnosisCount: patientDiagnoses.length,
        latestDiagnosis: patientDiagnoses.length > 0 ? patientDiagnoses[0] : null
      };
    });

    if (format === 'json') {
      const dataStr = JSON.stringify(combinedData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `patients_with_diagnosis_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } else {
      const headers = [
        'Patient ID', 'Patient Name', 'Age (days)', 'Gender', 'State', 'Hospital ID',
        'Assigned Doctor ID', 'Risk Score', 'Patient Status', 'Admission Date',
        'Total Diagnoses', 'Latest Diagnosis Date', 'Latest Diagnosis Type',
        'Latest Severity', 'Latest ML Risk Score', 'Latest Treatment Plan', 
        'Latest Diagnosis Status'
      ];

      const rows = combinedData.map(item => [
        item.patient.id,
        item.patient.name,
        item.patient.age,
        item.patient.gender,
        item.patient.state,
        item.patient.hospitalId,
        item.patient.assignedDoctorId,
        item.patient.riskScore,
        item.patient.status,
        item.patient.admissionDate?.toISOString() || '',
        item.diagnosisCount,
        item.latestDiagnosis?.diagnosisDate?.toISOString() || '',
        item.latestDiagnosis?.diagnosisType || '',
        item.latestDiagnosis?.severity || '',
        item.latestDiagnosis?.mlPrediction?.riskScore || '',
        `"${item.latestDiagnosis?.treatmentPlan?.replace(/"/g, '""') || ''}"`,
        item.latestDiagnosis?.status || ''
      ]);

      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const dataBlob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `patients_with_diagnosis_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    }
  } catch (error) {
    console.error('Error downloading patient data with diagnosis:', error);
    throw error;
  }
};

// Get statistics by state for national admin drilling down
export const getStateStats = async (state: string) => {
  try {
    const hospitalsRef = collection(db, 'hospitals');
    const patientsRef = collection(db, 'patients');
    const usersRef = collection(db, 'users');

    const [hospitalsSnapshot, patientsSnapshot, doctorsSnapshot] = await Promise.all([
      getDocs(query(hospitalsRef, where('state', '==', state))),
      getDocs(query(patientsRef, where('state', '==', state))),
      getDocs(query(usersRef, where('state', '==', state), where('role', '==', UserRole.CLINICIAN)))
    ]);

    const hospitals = hospitalsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Hospital));
    const patients = patientsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Patient));
    const doctors = doctorsSnapshot.docs;

    const totalBeds = hospitals.reduce((sum, h) => sum + (h.totalBeds || 0), 0);
    const totalNicuBeds = hospitals.reduce((sum, h) => sum + (h.nicuBeds || 0), 0);

    return {
      state,
      totalHospitals: hospitals.length,
      totalDoctors: doctors.length,
      totalPatients: patients.length,
      criticalPatients: patients.filter(p => p.status === 'critical' || p.riskScore >= 0.7).length,
      totalBeds,
      totalNicuBeds
    };
  } catch (error) {
    console.error('Error fetching state stats:', error);
    return null;
  }
};

// Get hospitals by state for state admin drilling down
export const getHospitalsByState = async (state: string): Promise<Hospital[]> => {
  try {
    const hospitalsRef = collection(db, 'hospitals');
    // Remove orderBy to avoid needing a composite index
    const q = query(hospitalsRef, where('state', '==', state));
    const snapshot = await getDocs(q);

    const hospitals = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date()
    } as Hospital));
    
    // Sort in memory instead
    return hospitals.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error('Error fetching hospitals by state:', error);
    return [];
  }
};

// Get doctors by hospital for hospital admin drilling down
export const getDoctorsByHospital = async (hospitalId: string): Promise<UserProfile[]> => {
  try {
    const usersRef = collection(db, 'users');
    // Remove orderBy to avoid composite index requirement
    const q = query(
      usersRef,
      where('role', '==', UserRole.CLINICIAN),
      where('hospitalId', '==', hospitalId)
    );
    const snapshot = await getDocs(q);

    const doctors = snapshot.docs.map(doc => ({
      uid: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date()
    } as UserProfile));
    
    // Sort in memory by name
    return doctors.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error('Error fetching doctors by hospital:', error);
    return [];
  }
};

// Get all unique states for national admin
export const getAllStates = async (): Promise<string[]> => {
  try {
    const hospitalsRef = collection(db, 'hospitals');
    const snapshot = await getDocs(hospitalsRef);
    const states = new Set<string>();
    
    snapshot.docs.forEach(doc => {
      const state = doc.data().state;
      if (state) states.add(state);
    });

    return Array.from(states).sort();
  } catch (error) {
    console.error('Error fetching states:', error);
    return [];
  }
};

// Get a specific hospital by ID
export const getHospitalById = async (hospitalId: string): Promise<Hospital | null> => {
  try {
    const hospitalRef = doc(db, 'hospitals', hospitalId);
    const hospitalDoc = await getDoc(hospitalRef);
    
    if (hospitalDoc.exists()) {
      return {
        id: hospitalDoc.id,
        ...hospitalDoc.data(),
        createdAt: hospitalDoc.data().createdAt?.toDate() || new Date()
      } as Hospital;
    }
    return null;
  } catch (error) {
    console.error('Error fetching hospital:', error);
    return null;
  }
};

// Get patients by hospital ID
export const getPatientsByHospital = async (hospitalId: string): Promise<Patient[]> => {
  try {
    const patientsRef = collection(db, 'patients');
    // Remove orderBy to avoid composite index requirement
    const q = query(patientsRef, where('hospitalId', '==', hospitalId));
    const snapshot = await getDocs(q);

    const patients = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      admissionDate: doc.data().admissionDate?.toDate() || new Date(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date()
    } as Patient));
    
    // Sort in memory by createdAt descending
    return patients.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  } catch (error) {
    console.error('Error fetching patients by hospital:', error);
    return [];
  }
};

// Get diagnoses by hospital ID
export const getDiagnosesByHospital = async (hospitalId: string): Promise<Diagnosis[]> => {
  try {
    const diagnosesRef = collection(db, 'diagnoses');
    // Remove orderBy to avoid composite index requirement
    const q = query(diagnosesRef, where('hospitalId', '==', hospitalId));
    const snapshot = await getDocs(q);

    const diagnoses = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      diagnosisDate: doc.data().diagnosisDate?.toDate() || new Date(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date()
    } as Diagnosis));
    
    // Sort in memory by diagnosisDate descending
    return diagnoses.sort((a, b) => b.diagnosisDate.getTime() - a.diagnosisDate.getTime());
  } catch (error) {
    console.error('Error fetching diagnoses by hospital:', error);
    return [];
  }
};

// Get patients by doctor ID
export const getPatientsByDoctor = async (doctorId: string): Promise<Patient[]> => {
  try {
    const patientsRef = collection(db, 'patients');
    // Remove orderBy to avoid composite index requirement
    const q = query(patientsRef, where('assignedDoctorId', '==', doctorId));
    const snapshot = await getDocs(q);

    const patients = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      admissionDate: doc.data().admissionDate?.toDate() || new Date(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date()
    } as Patient));
    
    // Sort in memory by createdAt descending
    return patients.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  } catch (error) {
    console.error('Error fetching patients by doctor:', error);
    return [];
  }
};

// Update patient status (e.g. close a case)
export const updatePatientStatus = async (patientId: string, status: string): Promise<void> => {
  try {
    const patientRef = doc(db, 'patients', patientId);
    await updateDoc(patientRef, {
      status,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating patient status:', error);
    throw error;
  }
};

// Download individual patient data with their diagnoses
export const downloadIndividualPatientData = async (
  patient: Patient,
  diagnoses: Diagnosis[],
  format: 'csv' | 'json' = 'json'
) => {
  const patientDiagnoses = diagnoses.filter(d => d.patientId === patient.id);
  const data = {
    patient: {
      id: patient.id,
      name: patient.name,
      age: patient.age,
      gender: patient.gender,
      status: patient.status,
      riskScore: patient.riskScore,
      admissionDate: patient.admissionDate,
      createdAt: patient.createdAt,
    },
    diagnoses: patientDiagnoses.map(d => ({
      id: d.id,
      type: d.diagnosisType,
      severity: d.severity,
      summary: d.diagnosisSummary,
      notes: d.detailedNotes,
      treatment: d.treatmentPlan,
      mlPrediction: d.mlPrediction,
      status: d.status,
      date: d.diagnosisDate,
    }))
  };

  if (format === 'json') {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${patient.name}_data.json`;
    a.click();
    URL.revokeObjectURL(url);
  } else {
    const headers = ['Patient Name', 'Age (days)', 'Gender', 'Status', 'Risk Score',
      'Diagnosis Date', 'Diagnosis Type', 'Severity', 'Summary', 'Treatment', 'ML Risk Score'];
    const rows = patientDiagnoses.map(d => [
      patient.name, patient.age, patient.gender, patient.status, patient.riskScore,
      d.diagnosisDate?.toISOString() || '', d.diagnosisType, d.severity,
      d.diagnosisSummary, d.treatmentPlan, d.mlPrediction?.riskScore || ''
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${patient.name}_data.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
};

// Get diagnoses by doctor ID
export const getDiagnosesByDoctor = async (doctorId: string): Promise<Diagnosis[]> => {
  try {
    const diagnosesRef = collection(db, 'diagnoses');
    // Remove orderBy to avoid composite index requirement
    const q = query(diagnosesRef, where('doctorId', '==', doctorId));
    const snapshot = await getDocs(q);

    const diagnoses = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      diagnosisDate: doc.data().diagnosisDate?.toDate() || new Date(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date()
    } as Diagnosis));
    
    // Sort in memory by diagnosisDate descending
    return diagnoses.sort((a, b) => b.diagnosisDate.getTime() - a.diagnosisDate.getTime());
  } catch (error) {
    console.error('Error fetching diagnoses by doctor:', error);
    return [];
  }
};
