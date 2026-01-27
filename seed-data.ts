/**
 * Seed Data Script for RBAC System
 * 
 * IMPORTANT: This is a TEMPLATE script. You need to:
 * 1. Install firebase-admin: npm install firebase-admin
 * 2. Download your Firebase Admin SDK credentials JSON from Firebase Console
 * 3. Update the serviceAccount import path
 * 4. Run this script with: node seed-data.js (or ts-node seed-data.ts)
 * 
 * This script creates test users and sample data in Firestore.
 */

// Uncomment and configure when ready to use:
/*
import * as admin from 'firebase-admin';
import * as serviceAccount from './path-to-your-firebase-admin-key.json';

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as admin.ServiceAccount)
});

const db = admin.firestore();
const auth = admin.auth();

// Sample data - TEMPLATE ONLY
// Replace with your actual hospital data when deploying
const hospitals = [
  { id: 'HOSP001', name: 'Sample Hospital A', state: 'Karnataka', address: 'City A', totalBeds: 500, nicuBeds: 50, contactNumber: '+91-XX-XXXX-XXXX' },
  { id: 'HOSP002', name: 'Sample Hospital B', state: 'Karnataka', address: 'City B', totalBeds: 300, nicuBeds: 30, contactNumber: '+91-XX-XXXX-XXXX' },
  { id: 'HOSP003', name: 'Sample Hospital C', state: 'Delhi', address: 'City C', totalBeds: 1000, nicuBeds: 100, contactNumber: '+91-XX-XXXX-XXXX' },
  { id: 'HOSP004', name: 'Sample Hospital D', state: 'Maharashtra', address: 'City D', totalBeds: 400, nicuBeds: 40, contactNumber: '+91-XX-XXXX-XXXX' }
];

// WARNING: REPLACE THESE TEST CREDENTIALS BEFORE PRODUCTION DEPLOYMENT
// These are EXAMPLE credentials only - use strong, unique passwords in production
const users = [
  { email: 'admin@example.com', password: 'CHANGE_THIS_PASSWORD', role: 'SUPER_ADMIN', name: 'National Admin' },
  { email: 'state.admin1@example.com', password: 'CHANGE_THIS_PASSWORD', role: 'STATE_ADMIN', name: 'State Admin 1', state: 'Karnataka' },
  { email: 'state.admin2@example.com', password: 'CHANGE_THIS_PASSWORD', role: 'STATE_ADMIN', name: 'State Admin 2', state: 'Delhi' },
  { email: 'hospital.admin1@example.com', password: 'CHANGE_THIS_PASSWORD', role: 'HOSPITAL_ADMIN', name: 'Hospital Admin 1', hospitalId: 'HOSP001' },
  { email: 'hospital.admin2@example.com', password: 'CHANGE_THIS_PASSWORD', role: 'HOSPITAL_ADMIN', name: 'Hospital Admin 2', hospitalId: 'HOSP002' },
  { email: 'doctor1@example.com', password: 'CHANGE_THIS_PASSWORD', role: 'CLINICIAN', name: 'Dr. Example One', hospitalId: 'HOSP001', designation: 'Senior Pediatrician' },
  { email: 'doctor2@example.com', password: 'CHANGE_THIS_PASSWORD', role: 'CLINICIAN', name: 'Dr. Example Two', hospitalId: 'HOSP001', designation: 'Neonatologist' },
  { email: 'doctor3@example.com', password: 'CHANGE_THIS_PASSWORD', role: 'CLINICIAN', name: 'Dr. Example Three', hospitalId: 'HOSP002', designation: 'Pediatric Specialist' }
];

// Sample patient data - ANONYMIZED FOR TEMPLATE
const patients = [
  { name: 'Patient A', age: 3, state: 'Karnataka', hospitalId: 'HOSP001', assignedDoctorId: '', riskScore: 0.85, status: 'critical' },
  { name: 'Patient B', age: 5, state: 'Karnataka', hospitalId: 'HOSP001', assignedDoctorId: '', riskScore: 0.45, status: 'stable' },
  { name: 'Patient C', age: 2, state: 'Karnataka', hospitalId: 'HOSP002', assignedDoctorId: '', riskScore: 0.72, status: 'critical' },
  { name: 'Patient D', age: 7, state: 'Delhi', hospitalId: 'HOSP003', assignedDoctorId: '', riskScore: 0.35, status: 'improving' },
  { name: 'Patient E', age: 4, state: 'Maharashtra', hospitalId: 'HOSP004', assignedDoctorId: '', riskScore: 0.62, status: 'stable' }
];

async function seedData() {
  try {
    console.log('🌱 Starting data seeding...');

    // 1. Create hospitals
    console.log('\n📍 Creating hospitals...');
    for (const hospital of hospitals) {
      await db.collection('hospitals').doc(hospital.id).set(hospital);
      console.log(`✅ Created hospital: ${hospital.name}`);
    }

    // 2. Create users with auth and profiles
    console.log('\n👥 Creating users...');
    const createdUsers = [];
    for (const userData of users) {
      try {
        // Create Firebase Auth user
        const userRecord = await auth.createUser({
          email: userData.email,
          password: userData.password,
          displayName: userData.name
        });

        // Create user profile in Firestore
        const userProfile = {
          uid: userRecord.uid,
          email: userData.email,
          name: userData.name,
          role: userData.role,
          ...(userData.state && { state: userData.state }),
          ...(userData.hospitalId && { hospitalId: userData.hospitalId }),
          ...(userData.designation && { designation: userData.designation }),
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        };

        await db.collection('users').doc(userRecord.uid).set(userProfile);
        
        console.log(`✅ Created user: ${userData.name} (${userData.email})`);
        
        // Store for patient assignment
        if (userData.role === 'CLINICIAN') {
          createdUsers.push({ ...userProfile, uid: userRecord.uid });
        }
      } catch (error: any) {
        console.error(`❌ Error creating user ${userData.email}:`, error.message);
      }
    }

    // 3. Create patients and assign to doctors
    console.log('\n👶 Creating patients...');
    const doctorsByHospital: { [key: string]: any[] } = {};
    createdUsers.forEach(user => {
      if (!doctorsByHospital[user.hospitalId]) {
        doctorsByHospital[user.hospitalId] = [];
      }
      doctorsByHospital[user.hospitalId].push(user);
    });

    for (const patient of patients) {
      // Assign doctor from the same hospital
      const doctors = doctorsByHospital[patient.hospitalId] || [];
      const assignedDoctor = doctors[Math.floor(Math.random() * doctors.length)];
      
      const patientData = {
        ...patient,
        assignedDoctorId: assignedDoctor ? assignedDoctor.uid : '',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      };

      const docRef = await db.collection('patients').add(patientData);
      console.log(`✅ Created patient: ${patient.name} (assigned to ${assignedDoctor?.name || 'Unassigned'})`);
    }

    console.log('\n✅ Data seeding completed successfully!');
    console.log('\n📋 Test Credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    users.forEach(user => {
      console.log(`${user.role}: ${user.email} / ${user.password}`);
    });
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  } catch (error) {
    console.error('❌ Error seeding data:', error);
  } finally {
    process.exit(0);
  }
}

// Run the seed function
seedData();
*/

console.log(`
╔════════════════════════════════════════════════════════════════╗
║                    RBAC SEED DATA SCRIPT                        ║
╚════════════════════════════════════════════════════════════════╝

⚠️  SETUP REQUIRED - Follow these steps:

1. Install firebase-admin:
   npm install firebase-admin --save-dev

2. Download Firebase Admin SDK credentials:
   • Go to Firebase Console → Project Settings → Service Accounts
   • Click "Generate New Private Key"
   • Save as 'firebase-admin-key.json' in project root
   • Add to .gitignore!

3. Uncomment the code in this file (seed-data.ts)

4. Update the serviceAccount import path:
   import * as serviceAccount from './firebase-admin-key.json';

5. Run the script:
   npx ts-node seed-data.ts
   or
   node seed-data.js

This will create:
• 4 Hospitals across different states
• 8 Test users (1 National Admin, 2 State Admins, 2 Hospital Admins, 3 Clinicians)
• 5 Sample patients assigned to doctors

All test accounts will have their credentials printed after seeding.
`);

export {};
