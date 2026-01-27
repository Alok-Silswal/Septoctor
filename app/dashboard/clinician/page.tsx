'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { UserRole } from '@/lib/rbac';
import { getPatientsByRole } from '@/lib/queries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export default function ClinicianDashboard() {
  const router = useRouter();
  const { userProfile, loading: authLoading, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState<any[]>([]);

  useEffect(() => {
    if (authLoading) return;
    if (!userProfile) { router.push('/'); return; }
    if (userProfile.role !== UserRole.CLINICIAN) { router.push('/'); return; }
    loadDashboardData();
  }, [userProfile, authLoading, router]);

  const loadDashboardData = async () => {
    if (!userProfile) return;
    try {
      setLoading(true);
      const patientsList = await getPatientsByRole(userProfile);
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

  if (!userProfile || userProfile.role !== UserRole.CLINICIAN) return null;

  const criticalPatients = patients.filter(p => p.status === 'critical' || p.riskScore >= 0.7);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-purple-100 p-6">
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Clinician Dashboard</h1>
            <p className="text-gray-600 mt-1">Dr. {userProfile.name} • {userProfile.designation}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push('/')}>New Assessment</Button>
            <Button variant="outline" onClick={signOut}>Sign Out</Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">My Patients</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{patients.length}</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">Critical Cases</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold text-red-600">{criticalPatients.length}</div></CardContent></Card>
        </div>

        {criticalPatients.length > 0 && (
          <Card className="border-red-300 bg-red-50">
            <CardHeader><CardTitle className="text-red-800">⚠️ Critical Patients</CardTitle></CardHeader>
            <CardContent>
              {criticalPatients.map((patient) => (
                <div key={patient.id} className="flex items-center justify-between p-3 bg-white rounded-lg border mb-2">
                  <div><p className="font-medium">{patient.name}</p><p className="text-sm text-gray-600">Age: {patient.age} days</p></div>
                  <Badge variant="destructive">Risk: {(patient.riskScore * 100).toFixed(0)}%</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle>All My Patients</CardTitle></CardHeader>
          <CardContent>
            {patients.length === 0 ? (
              <div className="text-center py-12"><p className="text-gray-500">No patients assigned yet</p></div>
            ) : (
              <Table>
                <TableHeader><TableRow><TableHead>Patient Name</TableHead><TableHead>Age</TableHead><TableHead>Risk Score</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {patients.map((patient) => (
                    <TableRow key={patient.id}><TableCell>{patient.name}</TableCell><TableCell>{patient.age} days</TableCell><TableCell><Badge variant={patient.riskScore >= 0.7 ? 'destructive' : 'secondary'}>{(patient.riskScore * 100).toFixed(0)}%</Badge></TableCell><TableCell><Badge>{patient.status}</Badge></TableCell></TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
