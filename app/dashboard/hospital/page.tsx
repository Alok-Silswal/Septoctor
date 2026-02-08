'use client';
import { useEffect, useState } from 'react';
import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { UserRole } from '@/lib/rbac';
import { getDashboardStats, getPatientsByRole, getDoctorsByRole, getDiagnosesByRole, downloadDiagnosisData, downloadPatientData, downloadPatientDataWithDiagnosis, getHospitalsByRole, getHospitalById, getPatientsByHospital, getDiagnosesByHospital, getDoctorsByHospital, Diagnosis } from '@/lib/queries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, ArrowLeft } from 'lucide-react';

export default function HospitalDashboard() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <HospitalDashboardInner />
    </Suspense>
  );
}

function HospitalDashboardInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const viewHospitalId = searchParams.get('hospitalId');
  const returnFrom = searchParams.get('returnFrom');
  const { userProfile, loading: authLoading, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [downloadingPatientData, setDownloadingPatientData] = useState(false);
  const [stats, setStats] = useState({ 
    totalPatients: 0, 
    criticalPatients: 0, 
    totalHospitals: 0, 
    totalDoctors: 0,
    totalBeds: 0,
    totalNicuBeds: 0,
    occupiedBeds: 0,
    bedOccupancyRate: 0
  });
  const [doctors, setDoctors] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [myHospital, setMyHospital] = useState<any>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!userProfile) { router.push('/'); return; }
    // Allow state and national admin to view hospital dashboard, otherwise check role
    if (userProfile.role !== UserRole.HOSPITAL_ADMIN && 
        userProfile.role !== UserRole.STATE_ADMIN && 
        userProfile.role !== UserRole.SUPER_ADMIN) { 
      router.push('/'); 
      return; 
    }
    loadDashboardData();
  }, [userProfile, authLoading, router, viewHospitalId]);

  const loadDashboardData = async () => {
    if (!userProfile) return;
    try {
      setLoading(true);
      
      // If viewing a specific hospital (from state/national drill-down), use that hospital
      let hospitalsList, doctorsList, patientsList, diagnosesList;
      
      if (viewHospitalId && (userProfile.role === UserRole.SUPER_ADMIN || userProfile.role === UserRole.STATE_ADMIN)) {
        // Admin viewing a specific hospital - use hospital-specific queries
        const [hospital, doctors, patients, diagnoses] = await Promise.all([
          getHospitalById(viewHospitalId),
          getDoctorsByHospital(viewHospitalId),
          getPatientsByHospital(viewHospitalId),
          getDiagnosesByHospital(viewHospitalId)
        ]);
        hospitalsList = hospital ? [hospital] : [];
        doctorsList = doctors;
        patientsList = patients;
        diagnosesList = diagnoses;
      } else {
        // Hospital admin viewing their own dashboard - use role-based queries
        const [hospitals, doctors, patients, diagnoses] = await Promise.all([
          getHospitalsByRole(userProfile),
          getDoctorsByRole(userProfile),
          getPatientsByRole(userProfile),
          getDiagnosesByRole(userProfile)
        ]);
        hospitalsList = hospitals;
        doctorsList = doctors;
        patientsList = patients;
        diagnosesList = diagnoses;
      }

      // Calculate stats for the hospital
      const totalBeds = hospitalsList.reduce((sum, h) => sum + (h.totalBeds || 0), 0);
      const totalNicuBeds = hospitalsList.reduce((sum, h) => sum + (h.nicuBeds || 0), 0);
      const occupiedBeds = patientsList.length;
      const bedOccupancyRate = totalBeds > 0 ? parseFloat((occupiedBeds / totalBeds * 100).toFixed(1)) : 0;

      setStats({
        totalPatients: patientsList.length,
        criticalPatients: patientsList.filter(p => p.status === 'critical' || p.riskScore >= 0.7).length,
        totalHospitals: hospitalsList.length,
        totalDoctors: doctorsList.length,
        totalBeds,
        totalNicuBeds,
        occupiedBeds,
        bedOccupancyRate
      });
      setDoctors(doctorsList);
      setPatients(patientsList);
      setDiagnoses(diagnosesList);
      // Hospital admin should only see their own hospital
      setMyHospital(hospitalsList.length > 0 ? hospitalsList[0] : null);
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
      router.push('/dashboard/national?returnFrom=hospital');
    } else if (returnFrom === 'state') {
      router.push('/dashboard/state?returnFrom=hospital');
    } else {
      router.push('/dashboard/hospital');
    }
  };

  const navigateToDoctor = (doctorId: string) => {
    router.push(`/dashboard/clinician?doctorId=${doctorId}&returnFrom=hospital`);
  };

  if (authLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center"><p>Loading...</p></div>;
  }

  if (!userProfile || (userProfile.role !== UserRole.HOSPITAL_ADMIN && 
      userProfile.role !== UserRole.STATE_ADMIN && 
      userProfile.role !== UserRole.SUPER_ADMIN)) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 p-6">
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex justify-between items-center">
          <div>
            {returnFrom && (
              <Button variant="ghost" size="sm" onClick={handleBackToDashboard} className="mb-2">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to {returnFrom === 'national' ? 'National' : returnFrom === 'state' ? 'State' : 'My'} Dashboard
              </Button>
            )}
            <h1 className="text-3xl font-bold text-gray-900">Hospital Admin Dashboard</h1>
            <p className="text-gray-600 mt-1">{userProfile.name}</p>
            {myHospital && <p className="text-sm text-gray-500">{myHospital.name}</p>}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push('/?startAssessment=true')}>New Assessment</Button>
            <Button variant="outline" onClick={signOut}>Sign Out</Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">Total Doctors</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{stats.totalDoctors}</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">Total Patients</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{stats.totalPatients}</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">Critical Patients</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold text-red-600">{stats.criticalPatients}</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">Total Diagnoses</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold text-green-600">{diagnoses.length}</div></CardContent></Card>
        </div>

        {/* Hospital Bed Capacity */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-blue-800">Total Beds</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-blue-900">{stats.totalBeds}</div></CardContent>
          </Card>
          <Card className="bg-purple-50 border-purple-200">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-purple-800">NICU Beds</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-purple-900">{stats.totalNicuBeds}</div></CardContent>
          </Card>
          <Card className="bg-amber-50 border-amber-200">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-amber-800">Occupied</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-amber-900">{stats.occupiedBeds}</div></CardContent>
          </Card>
          <Card className="bg-green-50 border-green-200">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-green-800">Occupancy</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-green-900">{stats.bedOccupancyRate}%</div></CardContent>
          </Card>
        </div>

        {/* Hospital Information Card */}
        {myHospital && (
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="text-green-900">Your Hospital</CardTitle>
              <CardDescription>Hospital facility information</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div><span className="font-medium">Name:</span> {myHospital.name}</div>
                <div><span className="font-medium">Location:</span> {myHospital.state}</div>
                <div><span className="font-medium">Address:</span> {myHospital.address}</div>
                <div><span className="font-medium">Contact:</span> {myHospital.contactNumber}</div>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="doctors">
          <TabsList>
            <TabsTrigger value="doctors">Doctors ({doctors.length})</TabsTrigger>
            <TabsTrigger value="diagnoses">Diagnoses ({diagnoses.length})</TabsTrigger>
            <TabsTrigger value="patients">Patients ({patients.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="doctors">
            <Card>
              <CardHeader>
                <CardTitle>Hospital Doctors</CardTitle>
                <CardDescription>Click on any doctor to view their dashboard</CardDescription>
              </CardHeader>
              <CardContent>
                {doctors.length === 0 ? (
                  <div className="text-center py-12"><p className="text-gray-500">No doctors found</p></div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Designation</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {doctors.map((doctor) => (
                        <TableRow 
                          key={doctor.uid}
                          className="cursor-pointer hover:bg-green-50"
                          onClick={() => navigateToDoctor(doctor.uid)}
                        >
                          <TableCell className="font-medium">{doctor.name}</TableCell>
                          <TableCell>{doctor.email}</TableCell>
                          <TableCell>{doctor.designation}</TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => navigateToDoctor(doctor.uid)}
                            >
                              View Dashboard
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="diagnoses">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>All Hospital Diagnoses</CardTitle>
                    <CardDescription>Diagnoses from all doctors in this hospital</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => downloadDiagnosisData(diagnoses, 'csv')}>
                      <Download className="h-4 w-4 mr-2" />CSV
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => downloadDiagnosisData(diagnoses, 'json')}>
                      <Download className="h-4 w-4 mr-2" />JSON
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
                          <TableHead>Doctor</TableHead>
                          <TableHead>Diagnosis</TableHead>
                          <TableHead>Severity</TableHead>
                          <TableHead>ML Risk</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {diagnoses.map((diagnosis) => (
                          <TableRow key={diagnosis.id}>
                            <TableCell className="text-sm">{new Date(diagnosis.diagnosisDate).toLocaleDateString()}</TableCell>
                            <TableCell className="font-medium">{diagnosis.patientName}</TableCell>
                            <TableCell className="text-sm">{diagnosis.doctorName}</TableCell>
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
                                <Badge variant={diagnosis.mlPrediction.riskScore >= 0.7 ? 'destructive' : 'secondary'}>
                                  {(diagnosis.mlPrediction.riskScore * 100).toFixed(0)}%
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell><Badge variant="outline">{diagnosis.status}</Badge></TableCell>
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
                  <CardTitle>All Patients</CardTitle>
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
        </Tabs>
      </div>
    </div>
  );
}
