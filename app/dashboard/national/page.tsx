'use client';
import { useEffect, useState } from 'react';
import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { UserRole } from '@/lib/rbac';
import { getPatientsByRole, getHospitalsByRole, getDoctorsByRole, getDiagnosesByRole, downloadDiagnosisData, downloadPatientData, downloadPatientDataWithDiagnosis, Diagnosis } from '@/lib/queries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, ArrowLeft } from 'lucide-react';

export default function NationalDashboard() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <NationalDashboardInner />
    </Suspense>
  );
}

function NationalDashboardInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnFrom = searchParams.get('returnFrom');
  const { userProfile, loading: authLoading, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [downloadingPatientData, setDownloadingPatientData] = useState(false);
  const [states, setStates] = useState<string[]>([]);
  const [stateStats, setStateStats] = useState<Record<string, any>>({});
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
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);

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
      // Fetch all data in ONE parallel batch (no duplicate calls)
      const [hospitalsList, patientsList, doctorsList, diagnosesList] = await Promise.all([
        getHospitalsByRole(userProfile),
        getPatientsByRole(userProfile),
        getDoctorsByRole(userProfile),
        getDiagnosesByRole(userProfile),
      ]);
      
      // Filter out hospitals with no bed data (likely duplicates)
      const hospitalsWithBeds = hospitalsList.filter(h => (h.totalBeds || 0) > 0 || (h.nicuBeds || 0) > 0);

      // Extract unique states from hospitals (avoids a separate full-collection fetch)
      const statesList = [...new Set(hospitalsList.map(h => h.state).filter(Boolean))].sort() as string[];

      // Compute dashboard stats locally from already-fetched data
      const totalBeds = hospitalsWithBeds.reduce((sum, h) => sum + (h.totalBeds || 0), 0);
      const totalNicuBeds = hospitalsWithBeds.reduce((sum, h) => sum + (h.nicuBeds || 0), 0);
      const occupiedBeds = patientsList.length;
      const bedOccupancyRate = totalBeds > 0 ? parseFloat((occupiedBeds / totalBeds * 100).toFixed(1)) : 0;

      setStats({
        totalPatients: patientsList.length,
        criticalPatients: patientsList.filter(p => p.status === 'critical' || p.riskScore >= 0.7).length,
        totalHospitals: hospitalsWithBeds.length,
        totalDoctors: doctorsList.length,
        totalBeds,
        totalNicuBeds,
        occupiedBeds,
        bedOccupancyRate
      });
      setHospitals(hospitalsWithBeds);
      setPatients(patientsList);
      setDiagnoses(diagnosesList);
      setStates(statesList);

      // Calculate stats per state
      const statsPerState: Record<string, any> = {};
      statesList.forEach(state => {
        const stateHospitals = hospitalsWithBeds.filter(h => h.state === state);
        const statePatients = patientsList.filter(p => p.state === state);
        statsPerState[state] = {
          hospitals: stateHospitals.length,
          patients: statePatients.length,
          criticalPatients: statePatients.filter(p => p.status === 'critical' || p.riskScore >= 0.7).length,
          totalBeds: stateHospitals.reduce((sum, h) => sum + (h.totalBeds || 0), 0)
        };
      });
      setStateStats(statsPerState);
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

  const navigateToState = (state: string) => {
    router.push(`/dashboard/state?state=${encodeURIComponent(state)}&returnFrom=national`);
  };

  if (authLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center"><p>Loading...</p></div>;
  }

  if (!userProfile || userProfile.role !== UserRole.SUPER_ADMIN) return null;

  const recentPatients = patients.slice(0, 10);
  const recentDiagnoses = diagnoses.slice(0, 15);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">National Admin Dashboard</h1>
            <p className="text-gray-600 mt-1">Welcome, {userProfile.name}</p>
            {returnFrom && (
              <p className="text-sm text-blue-600 mt-1">
                Returned from {returnFrom === 'state' ? 'State' : returnFrom === 'hospital' ? 'Hospital' : 'Clinician'} Dashboard
              </p>
            )}
          </div>
          <Button variant="outline" onClick={signOut}>Sign Out</Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">Total Hospitals</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{stats.totalHospitals}</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">Total Doctors</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{stats.totalDoctors}</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">Total Patients</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{stats.totalPatients}</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">Critical Patients</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold text-red-600">{stats.criticalPatients}</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">Total Diagnoses</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold text-gray-700">{diagnoses.length}</div></CardContent></Card>
        </div>

        {/* Bed Capacity Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-800">Total Bed Capacity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-900">{stats.totalBeds.toLocaleString()}</div>
              <p className="text-xs text-blue-600 mt-1">Nationwide capacity</p>
            </CardContent>
          </Card>
          <Card className="bg-purple-50 border-purple-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-purple-800">NICU Beds</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-900">{stats.totalNicuBeds.toLocaleString()}</div>
              <p className="text-xs text-purple-600 mt-1">Specialized care</p>
            </CardContent>
          </Card>
          <Card className="bg-amber-50 border-amber-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-amber-800">Occupied Beds</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-900">{stats.occupiedBeds}</div>
              <p className="text-xs text-amber-600 mt-1">Current patients</p>
            </CardContent>
          </Card>
          <Card className="bg-green-50 border-green-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-800">Occupancy Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-900">{stats.bedOccupancyRate}%</div>
              <p className="text-xs text-green-600 mt-1">Utilization</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="states">
          <TabsList>
            <TabsTrigger value="states">States ({states.length})</TabsTrigger>
            <TabsTrigger value="diagnoses">All Diagnoses ({diagnoses.length})</TabsTrigger>
            <TabsTrigger value="hospitals">Hospitals ({hospitals.length})</TabsTrigger>
            <TabsTrigger value="patients">Patients ({patients.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="states">
            <Card>
              <CardHeader>
                <CardTitle>All States</CardTitle>
                <CardDescription>Click on any state to view its dashboard</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {states.map((state) => (
                    <Card 
                      key={state}
                      className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-blue-500"
                      onClick={() => navigateToState(state)}
                    >
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg">{state}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Hospitals:</span>
                          <span className="font-semibold">{stateStats[state]?.hospitals || 0}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Patients:</span>
                          <span className="font-semibold">{stateStats[state]?.patients || 0}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Critical:</span>
                          <span className="font-semibold text-red-600">{stateStats[state]?.criticalPatients || 0}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Total Beds:</span>
                          <span className="font-semibold">{stateStats[state]?.totalBeds || 0}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="diagnoses">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>All Diagnoses Nationwide</CardTitle>
                    <CardDescription>Showing {recentDiagnoses.length} most recent diagnoses across all states and hospitals</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => downloadDiagnosisData(diagnoses, 'csv')}>
                      <Download className="h-4 w-4 mr-2" />Export CSV
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => downloadDiagnosisData(diagnoses, 'json')}>
                      <Download className="h-4 w-4 mr-2" />Export JSON
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
                          <TableHead>State</TableHead>
                          <TableHead>Hospital</TableHead>
                          <TableHead>Patient</TableHead>
                          <TableHead>Doctor</TableHead>
                          <TableHead>Diagnosis</TableHead>
                          <TableHead>Severity</TableHead>
                          <TableHead>ML Risk</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recentDiagnoses.map((diagnosis) => (
                          <TableRow key={diagnosis.id}>
                            <TableCell className="text-sm">{new Date(diagnosis.diagnosisDate).toLocaleDateString()}</TableCell>
                            <TableCell className="text-sm font-medium">{diagnosis.state}</TableCell>
                            <TableCell className="text-sm">{diagnosis.hospitalId}</TableCell>
                            <TableCell className="font-medium">{diagnosis.patientName}</TableCell>
                            <TableCell className="text-sm">{diagnosis.doctorName}</TableCell>
                            <TableCell>
                              <div className="max-w-xs">
                                <p className="font-medium capitalize text-sm">{diagnosis.diagnosisType.replace(/_/g, ' ')}</p>
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
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="hospitals">
            <Card>
              <CardHeader><CardTitle>All Hospitals</CardTitle><CardDescription>Hospitals across all states with bed capacity</CardDescription></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Hospital Name</TableHead><TableHead>State</TableHead><TableHead>Total Beds</TableHead><TableHead>NICU Beds</TableHead><TableHead>Contact</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {hospitals.map((hospital) => (
                      <TableRow key={hospital.id}>
                        <TableCell className="font-medium">{hospital.name}</TableCell>
                        <TableCell>
                          <Button 
                            variant="link" 
                            className="p-0 h-auto"
                            onClick={() => navigateToState(hospital.state)}
                          >
                            {hospital.state}
                          </Button>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono">
                            {hospital.totalBeds || 0}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="font-mono">
                            {hospital.nicuBeds || 0}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">{hospital.contactNumber || 'N/A'}</TableCell>
                        <TableCell>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => router.push(`/dashboard/hospital?hospitalId=${hospital.id}&returnFrom=national`)}
                          >
                            View Dashboard
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="patients">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Recent Patients</CardTitle>
                    <CardDescription>Showing latest 10 patients</CardDescription>
                  </div>
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
                  <TableHeader><TableRow><TableHead>Patient Name</TableHead><TableHead>Hospital ID</TableHead><TableHead>State</TableHead><TableHead>Risk Score</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {recentPatients.map((patient) => (
                      <TableRow key={patient.id}><TableCell>{patient.name}</TableCell><TableCell>{patient.hospitalId}</TableCell><TableCell>{patient.state}</TableCell><TableCell><Badge variant={patient.riskScore >= 0.7 ? 'destructive' : 'secondary'}>{(patient.riskScore * 100).toFixed(0)}%</Badge></TableCell><TableCell><Badge>{patient.status}</Badge></TableCell></TableRow>
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
