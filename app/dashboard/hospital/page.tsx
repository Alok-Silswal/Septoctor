'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { UserRole } from '@/lib/rbac';
import { getDashboardStats, getPatientsByRole, getDoctorsByRole } from '@/lib/queries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function HospitalAdminDashboard() {
  const router = useRouter();
  const { userProfile, loading: authLoading, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalPatients: 0, criticalPatients: 0, totalHospitals: 0, totalDoctors: 0 });
  const [doctors, setDoctors] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);

  useEffect(() => {
    if (authLoading) return;
    if (!userProfile) { router.push('/'); return; }
    if (userProfile.role !== UserRole.HOSPITAL_ADMIN) { router.push('/'); return; }
    loadDashboardData();
  }, [userProfile, authLoading, router]);

  const loadDashboardData = async () => {
    if (!userProfile) return;
    try {
      setLoading(true);
      const [dashboardStats, doctorsList, patientsList] = await Promise.all([
        getDashboardStats(userProfile),
        getDoctorsByRole(userProfile),
        getPatientsByRole(userProfile)
      ]);
      setStats(dashboardStats);
      setDoctors(doctorsList);
      setPatients(patientsList);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center"><p>Loading...</p></div>;
  }

  if (!userProfile || userProfile.role !== UserRole.HOSPITAL_ADMIN) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 p-6">
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Hospital Admin Dashboard</h1>
            <p className="text-gray-600 mt-1">{userProfile.name}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push('/')}>New Assessment</Button>
            <Button variant="outline" onClick={signOut}>Sign Out</Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">Total Doctors</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{stats.totalDoctors}</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">Total Patients</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{stats.totalPatients}</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">Critical Patients</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold text-red-600">{stats.criticalPatients}</div></CardContent></Card>
        </div>

        <Tabs defaultValue="patients">
          <TabsList><TabsTrigger value="patients">Patients ({patients.length})</TabsTrigger><TabsTrigger value="doctors">Doctors ({doctors.length})</TabsTrigger></TabsList>
          <TabsContent value="patients">
            <Card>
              <CardHeader><CardTitle>All Patients</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Patient Name</TableHead><TableHead>Assigned Doctor</TableHead><TableHead>Risk Score</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {patients.map((patient) => (
                      <TableRow key={patient.id}><TableCell>{patient.name}</TableCell><TableCell>{patient.assignedDoctorId}</TableCell><TableCell><Badge variant={patient.riskScore >= 0.7 ? 'destructive' : 'secondary'}>{(patient.riskScore * 100).toFixed(0)}%</Badge></TableCell><TableCell><Badge>{patient.status}</Badge></TableCell></TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="doctors">
            <Card>
              <CardHeader><CardTitle>Hospital Doctors</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Designation</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {doctors.map((doctor) => (
                      <TableRow key={doctor.uid}><TableCell>{doctor.name}</TableCell><TableCell>{doctor.email}</TableCell><TableCell>{doctor.designation}</TableCell></TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
