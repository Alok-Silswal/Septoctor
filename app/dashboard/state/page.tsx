'use client';

import { useEffect, useState } from 'react';
import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { UserRole } from '@/lib/rbac';
import { getDashboardStats, getPatientsByRole, getHospitalsByRole, getHospitalsByState, getDiagnosesByRole, downloadDiagnosisData, downloadPatientData, downloadPatientDataWithDiagnosis, Diagnosis } from '@/lib/queries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, ArrowLeft } from 'lucide-react';

export default function StateDashboard() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <StateDashboardInner />
    </Suspense>
  );
}

function StateDashboardInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const viewState = searchParams.get('state');
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
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);

  useEffect(() => {
    if (authLoading) return;
    if (!userProfile) { router.push('/'); return; }
    // Allow national admin to view state dashboard, otherwise check role
    if (userProfile.role !== UserRole.STATE_ADMIN && userProfile.role !== UserRole.SUPER_ADMIN) { 
      router.push('/'); 
      return; 
    }
    loadDashboardData();
  }, [userProfile, authLoading, router, viewState]);

  const loadDashboardData = async () => {
    if (!userProfile) return;
    try {
      setLoading(true);
      
      console.log('Loading dashboard data for user:', userProfile.role, 'State:', userProfile.state);
      
      // If viewing a specific state (from national drill-down), use that state
      // Otherwise use the user's assigned state
      const targetState = viewState || userProfile.state;
      
      // For national admin viewing a state, we need to filter data by that state
      let hospitalsList, patientsList, diagnosesList;
      
      if (viewState && userProfile.role === UserRole.SUPER_ADMIN) {
        // National admin viewing a specific state - use state-specific queries
        console.log('Loading for National Admin viewing state:', viewState);
        hospitalsList = await getHospitalsByState(viewState);
        // For patients and diagnoses, we need to fetch all and then filter
        const [allPatients, allDiagnoses] = await Promise.all([
          getPatientsByRole(userProfile),
          getDiagnosesByRole(userProfile)
        ]);
        patientsList = allPatients.filter(p => p.state === viewState);
        diagnosesList = allDiagnoses.filter(d => d.state === viewState);
      } else {
        // State admin viewing their own dashboard - use role-based query (already filtered by state)
        console.log('Loading for State Admin');
        const [hospitals, patients, diagnoses] = await Promise.all([
          getHospitalsByRole(userProfile),
          getPatientsByRole(userProfile),
          getDiagnosesByRole(userProfile)
        ]);
        hospitalsList = hospitals;
        patientsList = patients;
        diagnosesList = diagnoses;
        console.log('Loaded data:', {
          hospitals: hospitalsList.length,
          patients: patientsList.length,
          diagnoses: diagnosesList.length
        });
      }

      // Filter out hospitals with no bed data (likely duplicates)
      const hospitalsWithBeds = hospitalsList.filter(h => (h.totalBeds || 0) > 0 || (h.nicuBeds || 0) > 0);
      
      // Calculate stats for the state
      const totalBeds = hospitalsWithBeds.reduce((sum, h) => sum + (h.totalBeds || 0), 0);
      const totalNicuBeds = hospitalsWithBeds.reduce((sum, h) => sum + (h.nicuBeds || 0), 0);
      const occupiedBeds = patientsList.length;
      const bedOccupancyRate = totalBeds > 0 ? parseFloat((occupiedBeds / totalBeds * 100).toFixed(1)) : 0;

      setStats({
        totalPatients: patientsList.length,
        criticalPatients: patientsList.filter(p => p.status === 'critical' || p.riskScore >= 0.7).length,
        totalHospitals: hospitalsWithBeds.length,
        totalDoctors: 0, // We'll calculate this if needed
        totalBeds,
        totalNicuBeds,
        occupiedBeds,
        bedOccupancyRate
      });
      setHospitals(hospitalsWithBeds);
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
      router.push('/dashboard/national?returnFrom=state');
    } else {
      router.push('/dashboard/state');
    }
  };

  const navigateToHospital = (hospitalId: string) => {
    router.push(`/dashboard/hospital?hospitalId=${hospitalId}&returnFrom=state`);
  };

  if (authLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center"><p>Loading...</p></div>;
  }

  if (!userProfile || (userProfile.role !== UserRole.STATE_ADMIN && userProfile.role !== UserRole.SUPER_ADMIN)) return null;

  const recentPatients = patients.slice(0, 10);
  const recentDiagnoses = diagnoses.slice(0, 10);
  const displayState = viewState || userProfile.state || 'Unknown';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 p-6">
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex justify-between items-center">
          <div>
            <div className="flex items-center gap-3">
              {returnFrom && (
                <Button variant="ghost" size="sm" onClick={handleBackToDashboard}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to {returnFrom === 'national' ? 'National' : 'My'} Dashboard
                </Button>
              )}
            </div>
            <h1 className="text-3xl font-bold text-gray-900">State Admin Dashboard</h1>
            <p className="text-gray-600 mt-1">{userProfile.name} • <span className="font-semibold">{displayState}</span></p>
          </div>
          <Button variant="outline" onClick={signOut}>Sign Out</Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">Hospitals</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{stats.totalHospitals}</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">Doctors</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{stats.totalDoctors}</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">Patients</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{stats.totalPatients}</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">Critical</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold text-red-600">{stats.criticalPatients}</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">Diagnoses</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold text-blue-600">{diagnoses.length}</div></CardContent></Card>
        </div>

        {/* State Bed Capacity */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-blue-800">Total Beds in {userProfile.state}</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-blue-900">{stats.totalBeds.toLocaleString()}</div></CardContent>
          </Card>
          <Card className="bg-purple-50 border-purple-200">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-purple-800">NICU Beds</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-purple-900">{stats.totalNicuBeds.toLocaleString()}</div></CardContent>
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

        <Tabs defaultValue="hospitals">
          <TabsList>
            <TabsTrigger value="hospitals">Hospitals ({hospitals.length})</TabsTrigger>
            <TabsTrigger value="diagnoses">Diagnoses ({diagnoses.length})</TabsTrigger>
            <TabsTrigger value="patients">Patients ({patients.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="hospitals">
            <Card>
              <CardHeader>
                <CardTitle>Hospitals in {displayState}</CardTitle>
                <CardDescription>Click on any hospital to view its dashboard</CardDescription>
              </CardHeader>
              <CardContent>
                {hospitals.length === 0 ? (
                  <div className="text-center py-12"><p className="text-gray-500">No hospitals found</p></div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Hospital Name</TableHead>
                          <TableHead>Address</TableHead>
                          <TableHead>Total Beds</TableHead>
                          <TableHead>NICU Beds</TableHead>
                          <TableHead>Contact</TableHead>
                          <TableHead>Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {hospitals.map((hospital) => (
                          <TableRow 
                            key={hospital.id} 
                            className="cursor-pointer hover:bg-blue-50"
                            onClick={() => navigateToHospital(hospital.id)}
                          >
                            <TableCell className="font-medium">{hospital.name}</TableCell>
                            <TableCell className="text-sm">{hospital.address}</TableCell>
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
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => navigateToHospital(hospital.id)}
                              >
                                View Dashboard
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="diagnoses">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>All Diagnoses in {displayState}</CardTitle>
                    <CardDescription>Showing {recentDiagnoses.length} most recent diagnoses</CardDescription>
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
                          <TableHead>Hospital</TableHead>
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
                            <TableCell className="font-medium">{diagnosis.patientName}</TableCell>
                            <TableCell className="text-sm">{diagnosis.hospitalId}</TableCell>
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
                  <TableHeader><TableRow><TableHead>Patient Name</TableHead><TableHead>Hospital ID</TableHead><TableHead>Risk Score</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {recentPatients.map((patient) => (
                      <TableRow key={patient.id}><TableCell>{patient.name}</TableCell><TableCell>{patient.hospitalId}</TableCell><TableCell><Badge variant={patient.riskScore >= 0.7 ? 'destructive' : 'secondary'}>{(patient.riskScore * 100).toFixed(0)}%</Badge></TableCell><TableCell><Badge>{patient.status}</Badge></TableCell></TableRow>
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
