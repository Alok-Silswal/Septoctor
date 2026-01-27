"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { LoginPage, type LoginCredentials } from "@/components/login-page"
import { DataInputPage } from "@/components/data-input-page"
import { AssessmentForm } from "@/components/assessment-form"
import { ProcessingPage } from "@/components/processing-page"
import { ResultsPage } from "@/components/results-page" 
import { DoctorInteractionPage } from "@/components/doctor-interaction-page"
import { FinalPage } from "@/components/final-page"
import { useAuth } from "@/hooks/use-auth"
import { UserRole } from "@/lib/rbac"

export interface AssessmentData {
  
  prom_present?: string;
  prom_duration_hours?: number;
  maternal_fever_celsius?: number;
  chorioamnionitis?: string;
  foul_smelling_liquor?: string;
  prolonged_labor?: string;
  pv_examinations_count?: number;
  unbooked_pregnancy?: string;
  maternal_uti_sti?: string;
  meconium_stained_liquor?: string;
  cotwin_iud?: string;

  gestational_age_category?: string;
  birth_weight_category?: string;
  apgar_1_min?: number;
  apgar_5_min?: number;
  resuscitation_required?: string;
  neonatal_sex?: string;

  temperature_celsius?: number;
  feeding_status?: string;
  activity_level?: string;
  respiratory_distress?: string;
  heart_rate_bpm?: number;
  apnea_present?: string;
  shock_present?: string;

   // ---- HSS ----
  hss_tlc_abnormal?: string;
  hss_anc_abnormal?: string;
  hss_it_ratio_high?: string;
  hss_im_ratio_high?: string;
  hss_platelet_low?: string;
  hss_neutrophil_degeneration?: string;
  hss_nrbc_elevated?: string;

  // ---- APGAR 1 min ----
  apgar1_appearance?: string;
  apgar1_pulse?: string;
  apgar1_grimace?: string;
  apgar1_activity?: string;
  apgar1_respiration?: string;

  // ---- APGAR 5 min ----
  apgar5_appearance?: string;
  apgar5_pulse?: string;
  apgar5_grimace?: string;
  apgar5_activity?: string;
  apgar5_respiration?: string;

  // ---- SCORES ----
  mnrs_score?: number;
  hss_score?: number;
  apgar1_total?: number;
  apgar5_total?: number;
}


export default function SeptoctorApp() {
  const router = useRouter()
  const { userProfile, loading: authLoading } = useAuth()
  const [currentPage, setCurrentPage] = useState(0) // Start at 0 for login
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userCredentials, setUserCredentials] = useState<LoginCredentials | null>(null)
  const [assessmentData, setAssessmentData] = useState<Partial<AssessmentData>>({})
  const [riskScore, setRiskScore] = useState<number | null>(null)

  // Auto-redirect only pure admin users to their dashboards
  // Hospital admins and clinicians get to choose between dashboard and assessment workflow
  useEffect(() => {
    if (authLoading) return
    
    if (userProfile) {
      // Only redirect pure admin roles (national/state level)
      if (userProfile.role === UserRole.SUPER_ADMIN) {
        router.push('/dashboard/national')
      } else if (userProfile.role === UserRole.STATE_ADMIN) {
        router.push('/dashboard/state')
      }
      // HOSPITAL_ADMIN and CLINICIAN users continue to normal flow with dashboard access
    }
  }, [userProfile, authLoading, router])

  const handleLogin = (credentials: LoginCredentials) => {
    // Store user credentials and navigate to data input page
    setUserCredentials(credentials)
    setIsLoggedIn(true)
    setCurrentPage(2) // Go directly to data input page after login
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleAssessmentSubmit = (data: AssessmentData) => {
    setAssessmentData(data)
    setCurrentPage(4) // Processing page

    // Simulate AI processing
    setTimeout(() => {
      // Mock risk calculation
      const mockRiskScore = Math.floor(Math.random() * 100)
      setRiskScore(mockRiskScore)
      setCurrentPage(5) // Results page
    }, 3000)
  }

  const renderCurrentPage = () => {
    // Show login page if not logged in
    if (!isLoggedIn) {
      return <LoginPage onLogin={handleLogin} />
    }

    switch (currentPage) {
      case 2:
        return <DataInputPage onManualEntry={() => handlePageChange(3)} onBack={() => {
          setIsLoggedIn(false)
          setCurrentPage(0)
        }} />
      case 3:
        return <AssessmentForm onSubmit={handleAssessmentSubmit} onBack={() => handlePageChange(2)} />
      case 4:
        return <ProcessingPage />
      case 5:
        return (
          <ResultsPage
            riskScore={riskScore}
            onDoctorInteraction={() => handlePageChange(6)}
            onFinalPage={() => handlePageChange(7)}
            onBack={() => handlePageChange(3)}
          />
        )
      case 6:
        return (
          <DoctorInteractionPage
            onBack={() => handlePageChange(5)}
            data={assessmentData}
          />
        );
      case 7:
        return <FinalPage onRestart={() => handlePageChange(2)} onBack={() => handlePageChange(5)} />
      default:
        return <DataInputPage onManualEntry={() => handlePageChange(3)} onBack={() => {
          setIsLoggedIn(false)
          setCurrentPage(0)
        }} />
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-medical-blue to-medical-teal">
      <div className="container mx-auto px-4 py-8">{renderCurrentPage()}</div>
    </div>
  )
}
