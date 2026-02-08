'use client';

export const dynamic = "force-dynamic";

import { useEffect, useState } from 'react';
import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { UserRole } from '@/lib/rbac';
import { getPatientsByRole, getDiagnosesByRole, downloadDiagnosisData, downloadPatientData, downloadPatientDataWithDiagnosis, downloadIndividualPatientData, updatePatientStatus, getPatientsByDoctor, getDiagnosesByDoctor, Diagnosis } from '@/lib/queries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, ArrowLeft, CheckCircle, XCircle } from 'lucide-react';



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

  const criticalPatients = patients.filter(p => {
    const score = typeof p.riskScore === 'number' && !isNaN(p.riskScore) ? p.riskScore : 0;
    return p.status === 'critical' || score >= 0.7;
  });

  const getPatientAge = (patient: any) => {
    const age = patient.age;
    if (typeof age === 'number' && !isNaN(age) && age > 0) return `${age} days`;
    return 'N/A';
  };

  const getPatientRiskDisplay = (patient: any) => {
    const score = patient.riskScore;
    if (typeof score === 'number' && !isNaN(score)) {
      const pct = score <= 1 ? (score * 100).toFixed(0) : score.toFixed(0);
      return { text: `${pct}%`, isHigh: (score <= 1 ? score : score / 100) >= 0.7 };
    }
    // Fallback: try to get from latest diagnosis
    const patientDiags = diagnoses.filter(d => d.patientId === patient.id);
    if (patientDiags.length > 0 && patientDiags[0].mlPrediction?.riskScore != null) {
      const rs = patientDiags[0].mlPrediction.riskScore;
      const pct = rs <= 1 ? (rs * 100).toFixed(0) : rs.toFixed(0);
      return { text: `${pct}%`, isHigh: (rs <= 1 ? rs : rs / 100) >= 0.7 };
    }
    return { text: 'N/A', isHigh: false };
  };

  const handleCloseCase = async (patientId: string) => {
    if (!confirm('Are you sure you want to close this case?')) return;
    try {
      await updatePatientStatus(patientId, 'closed');
      // Refresh data
      setPatients(prev => prev.map(p => p.id === patientId ? { ...p, status: 'closed' } : p));
    } catch (error) {
      console.error('Error closing case:', error);
      alert('Failed to close case');
    }
  };

  const handleReopenCase = async (patientId: string) => {
    try {
      await updatePatientStatus(patientId, 'active');
      setPatients(prev => prev.map(p => p.id === patientId ? { ...p, status: 'active' } : p));
    } catch (error) {
      console.error('Error reopening case:', error);
      alert('Failed to reopen case');
    }
  };

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
            <CardHeader><CardTitle className="text-red-800">⚠️ Critical Patients ({criticalPatients.length})</CardTitle></CardHeader>
            <CardContent className="space-y-2 max-h-[300px] overflow-y-auto">
              {criticalPatients.map((patient) => {
                const risk = getPatientRiskDisplay(patient);
                return (
                  <div key={patient.id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                    <div>
                      <p className="font-medium">{patient.name}</p>
                      <p className="text-sm text-gray-600">Age: {getPatientAge(patient)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive">Risk: {risk.text}</Badge>
                      {patient.status !== 'closed' && (
                        <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => handleCloseCase(patient.id)}>
                          <CheckCircle className="h-3 w-3 mr-1" /> Close Case
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
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
                      {downloadingPatientData ? 'Downloading...' : 'All Patients CSV'}
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleDownloadPatientData('json')}
                      disabled={downloadingPatientData}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      {downloadingPatientData ? 'Downloading...' : 'All Patients JSON'}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {patients.length === 0 ? (
                  <div className="text-center py-12"><p className="text-gray-500">No patients assigned yet</p></div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Patient Name</TableHead>
                          <TableHead>Age</TableHead>
                          <TableHead>Risk Score</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {patients.map((patient) => {
                          const risk = getPatientRiskDisplay(patient);
                          return (
                            <TableRow key={patient.id} className={patient.status === 'closed' ? 'opacity-60' : ''}>
                              <TableCell className="font-medium">{patient.name}</TableCell>
                              <TableCell>{getPatientAge(patient)}</TableCell>
                              <TableCell>
                                <Badge variant={risk.isHigh ? 'destructive' : 'secondary'}>
                                  {risk.text}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant={patient.status === 'closed' ? 'outline' : patient.status === 'critical' ? 'destructive' : 'default'}>
                                  {patient.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex gap-1 justify-end">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 text-xs"
                                    onClick={() => downloadIndividualPatientData(patient, diagnoses, 'json')}
                                    title="Download patient data"
                                  >
                                    <Download className="h-3 w-3 mr-1" /> Data
                                  </Button>
                                  {patient.status !== 'closed' ? (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                                      onClick={() => handleCloseCase(patient.id)}
                                    >
                                      <XCircle className="h-3 w-3 mr-1" /> Close
                                    </Button>
                                  ) : (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 text-xs text-green-600 hover:text-green-700 hover:bg-green-50"
                                      onClick={() => handleReopenCase(patient.id)}
                                    >
                                      <CheckCircle className="h-3 w-3 mr-1" /> Reopen
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
