'use client';


import { useEffect, useState } from 'react';
import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { UserRole } from '@/lib/rbac';
import { getPatientsByRole, getDiagnosesByRole, downloadDiagnosisData, downloadPatientData, downloadPatientDataWithDiagnosis, getPatientsByDoctor, getDiagnosesByDoctor, Diagnosis } from '@/lib/queries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, ArrowLeft } from 'lucide-react';

export const dynamic = "force-dynamic";

export default function ClinicianDashboard() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <ClinicianDashboardInner />
    </Suspense>
  );
}

function ClinicianDashboardInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const viewDoctorId = searchParams.get('doctorId');
  const returnFrom = searchParams.get('returnFrom');
  const { userProfile, loading: authLoading, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [downloadingPatientData, setDownloadingPatientData] = useState(false);
  const [patients, setPatients] = useState<any[]>([]);
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);

  useEffect(() => {
    if (authLoading) return;
    if (!userProfile) { router.push('/'); return; }
    // Allow hospital, state, and national admin to view clinician dashboard
    if (userProfile.role !== UserRole.CLINICIAN && 
        userProfile.role !== UserRole.HOSPITAL_ADMIN && 
        userProfile.role !== UserRole.STATE_ADMIN && 
        userProfile.role !== UserRole.SUPER_ADMIN) { 
      router.push('/'); 
      return; 
    }
    loadDashboardData();
  }, [userProfile, authLoading, router, viewDoctorId]);

  const loadDashboardData = async () => {
    if (!userProfile) return;
    try {
      setLoading(true);
      
      let patientsList, diagnosesList;
      
      // If viewing a specific doctor (from hospital drill-down), use that doctor's data
      if (viewDoctorId && (userProfile.role === UserRole.SUPER_ADMIN || 
          userProfile.role === UserRole.STATE_ADMIN || 
          userProfile.role === UserRole.HOSPITAL_ADMIN)) {
        // Admin viewing a specific doctor - use doctor-specific queries
        const [patients, diagnoses] = await Promise.all([
          getPatientsByDoctor(viewDoctorId),
          getDiagnosesByDoctor(viewDoctorId)
        ]);
        patientsList = patients;
        diagnosesList = diagnoses;
      } else {
        // Clinician viewing their own dashboard - use role-based queries
        const [patients, diagnoses] = await Promise.all([
          getPatientsByRole(userProfile),
          getDiagnosesByRole(userProfile)
        ]);
        patientsList = patients;
        diagnosesList = diagnoses;
      }
      
      setPatients(patientsList);
      setDiagnoses(diagnosesList);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPatientData = async (format: 'csv' | 'json') => {
    if (!userProfile) return;
    setDownloadingPatientData(true);
    try {
      await downloadPatientDataWithDiagnosis(userProfile, format);
    } catch (error) {
      console.error('Error downloading patient data:', error);
      alert('Failed to download patient data');
    } finally {
      setDownloadingPatientData(false);
    }
  };

  const handleBackToDashboard = () => {
    if (returnFrom === 'national') {
      router.push('/dashboard/national?returnFrom=clinician');
    } else if (returnFrom === 'state') {
      router.push('/dashboard/state?returnFrom=clinician');
    } else if (returnFrom === 'hospital') {
      router.push('/dashboard/hospital?returnFrom=clinician');
    } else {
      router.push('/dashboard/clinician');
    }
  };

  if (authLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center"><p>Loading...</p></div>;
  }

  if (!userProfile || (userProfile.role !== UserRole.CLINICIAN && 
      userProfile.role !== UserRole.HOSPITAL_ADMIN && 
      userProfile.role !== UserRole.STATE_ADMIN && 
      userProfile.role !== UserRole.SUPER_ADMIN)) return null;

  const criticalPatients = patients.filter(p => p.status === 'critical' || p.riskScore >= 0.7);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-purple-100 p-6">
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex justify-between items-center">
          <div>
            {returnFrom && (
              <Button variant="ghost" size="sm" onClick={handleBackToDashboard} className="mb-2">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to {returnFrom === 'national' ? 'National' : returnFrom === 'state' ? 'State' : 'Hospital'} Dashboard
              </Button>
            )}
            <h1 className="text-3xl font-bold text-gray-900">Clinician Dashboard</h1>
            <p className="text-gray-600 mt-1">Dr. {userProfile.name} • {userProfile.designation}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push('/?startAssessment=true')}>New Assessment</Button>
            <Button variant="outline" onClick={signOut}>Sign Out</Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">My Patients</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{patients.length}</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">Critical Cases</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold text-red-600">{criticalPatients.length}</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">Total Diagnoses</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold text-purple-600">{diagnoses.length}</div></CardContent></Card>
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

        <Tabs defaultValue="diagnoses">
          <TabsList>
            <TabsTrigger value="diagnoses">Diagnoses ({diagnoses.length})</TabsTrigger>
            <TabsTrigger value="patients">Patients ({patients.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="diagnoses">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>My Diagnoses</CardTitle>
                    <CardDescription>All diagnoses you have created</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => downloadDiagnosisData(diagnoses, 'csv')}>
                      <Download className="h-4 w-4 mr-2" />Download CSV
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => downloadDiagnosisData(diagnoses, 'json')}>
                      <Download className="h-4 w-4 mr-2" />Download JSON
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {diagnoses.length === 0 ? (
                  <div className="text-center py-12"><p className="text-gray-500">No diagnoses recorded yet</p></div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Patient</TableHead>
                          <TableHead>Diagnosis</TableHead>
                          <TableHead>Severity</TableHead>
                          <TableHead>ML Risk</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Treatment</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {diagnoses.map((diagnosis) => (
                          <TableRow key={diagnosis.id}>
                            <TableCell className="text-sm">{new Date(diagnosis.diagnosisDate).toLocaleDateString()}</TableCell>
                            <TableCell className="font-medium">{diagnosis.patientName}</TableCell>
                            <TableCell>
                              <div className="max-w-xs">
                                <p className="font-medium capitalize">{diagnosis.diagnosisType.replace(/_/g, ' ')}</p>
                                <p className="text-xs text-gray-500 truncate">{diagnosis.diagnosisSummary}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={
                                diagnosis.severity === 'critical' ? 'destructive' :
                                diagnosis.severity === 'high' ? 'destructive' :
                                diagnosis.severity === 'medium' ? 'default' : 'secondary'
                              }>{diagnosis.severity}</Badge>
                            </TableCell>
                            <TableCell>
                              {diagnosis.mlPrediction && (
                                <div className="text-sm">
                                  <Badge variant={diagnosis.mlPrediction.riskScore >= 0.7 ? 'destructive' : 'secondary'}>
                                    {(diagnosis.mlPrediction.riskScore * 100).toFixed(0)}%
                                  </Badge>
                                  <p className="text-xs text-gray-500 mt-1">Conf: {(diagnosis.mlPrediction.confidence * 100).toFixed(0)}%</p>
                                </div>
                              )}
                            </TableCell>
                            <TableCell><Badge variant="outline">{diagnosis.status}</Badge></TableCell>
                            <TableCell className="max-w-xs truncate text-sm">{diagnosis.treatmentPlan}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="patients">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>All My Patients</CardTitle>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleDownloadPatientData('csv')}
                      disabled={downloadingPatientData}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      {downloadingPatientData ? 'Downloading...' : 'Patients + Diagnosis CSV'}
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleDownloadPatientData('json')}
                      disabled={downloadingPatientData}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      {downloadingPatientData ? 'Downloading...' : 'Patients + Diagnosis JSON'}
                    </Button>
                  </div>
                </div>
              </CardHeader>
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
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
