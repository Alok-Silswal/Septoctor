'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { UserRole } from '@/lib/rbac';
import { getDashboardStats, getPatientsByRole, getHospitalsByRole } from '@/lib/queries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export default function NationalAdminDashboard() {
  const router = useRouter();
  const { userProfile, loading: authLoading, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalPatients: 0, criticalPatients: 0, totalHospitals: 0, totalDoctors: 0 });
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);

  useEffect(() => {
    if (authLoading) return;
    if (!userProfile) { router.push('/'); return; }
    if (userProfile.role !== UserRole.SUPER_ADMIN) { router.push('/'); return; }
    loadDashboardData();
  }, [userProfile, authLoading, router]);

  const loadDashboardData = async () => {
    if (!userProfile) return;
    try {
      setLoading(true);
      const [dashboardStats, hospitalsList, patientsList] = await Promise.all([
        getDashboardStats(userProfile),
        getHospitalsByRole(userProfile),
        getPatientsByRole(userProfile)
      ]);
      setStats(dashboardStats);
      setHospitals(hospitalsList);
      setPatients(patientsList.slice(0, 10));
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center"><p>Loading...</p></div>;
  }

  if (!userProfile || userProfile.role !== UserRole.SUPER_ADMIN) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">National Admin Dashboard</h1>
            <p className="text-gray-600 mt-1">Welcome, {userProfile.name}</p>
          </div>
          <Button variant="outline" onClick={signOut}>Sign Out</Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">Total Hospitals</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{stats.totalHospitals}</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">Total Doctors</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{stats.totalDoctors}</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">Total Patients</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{stats.totalPatients}</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">Critical Patients</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold text-red-600">{stats.criticalPatients}</div></CardContent></Card>
        </div>

        <Card>
          <CardHeader><CardTitle>All Hospitals</CardTitle><CardDescription>Hospitals across all states</CardDescription></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Hospital Name</TableHead><TableHead>State</TableHead><TableHead>Total Beds</TableHead><TableHead>NICU Beds</TableHead></TableRow></TableHeader>
              <TableBody>
                {hospitals.map((hospital) => (
                  <TableRow key={hospital.id}><TableCell className="font-medium">{hospital.name}</TableCell><TableCell>{hospital.state}</TableCell><TableCell>{hospital.totalBeds}</TableCell><TableCell>{hospital.nicuBeds}</TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Recent Patients</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Patient Name</TableHead><TableHead>Hospital ID</TableHead><TableHead>State</TableHead><TableHead>Risk Score</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {patients.map((patient) => (
                  <TableRow key={patient.id}><TableCell>{patient.name}</TableCell><TableCell>{patient.hospitalId}</TableCell><TableCell>{patient.state}</TableCell><TableCell><Badge variant={patient.riskScore >= 0.7 ? 'destructive' : 'secondary'}>{(patient.riskScore * 100).toFixed(0)}%</Badge></TableCell><TableCell><Badge>{patient.status}</Badge></TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
