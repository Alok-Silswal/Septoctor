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

export type AssessmentData = {
  // Neonatal Information
  sex: string
  gestationalAge: number
  birthWeight: number
  gestationalStatus: string
  apgarScore: number
  apgarCategory: string
  multipleSeizures: string

  // Vital Signs
  meanBloodPressure: number
  lowestTemperature: number
  lowestSerumPH: number
  urineOutput: number
  abnormalTemperature: string

  // Respiratory & Circulatory Support
  incubatedAtSepsisEvaluation: string
  inotropeAtSepsisEvaluation: string
  centralVenousLine: string
  umbilicalArterialLine: string

  // Respiratory Support & Oxygenation
  oxygenationMethod: string
  hfov: string
  spo2Fio2Ratio: string
  pao2Fio2Ratio: string
  apneicSpells: string
  respiratoryDistress: string
  bradycardias: string
  fastBreathing: string
  chestIndrawing: string
  grunting: string

  // Comorbidities
  necrotizingEnterocolitis: string
  chronicLungDisease: string
  surgicalConditions: string
  intraventricularHemorrhage: string

  // Circulatory System
  cardiovascularStatus: string
  skinColouration: string
  microcirculation: string
  liverEnlargement: string
  prolongedCapillaryRefillTime: number
  cyanosis: string

  // Hematologic & Immune System
  plateletCount: string
  totalWBCCount: string
  totalPMNCount: string
  immaturePMNCount: string
  itPMNRatio: string
  imPMNRatio: string
  degenerativePMNChanges: string
  shiftToLeft: string

  // Metabolic & Neuromuscular Signs
  metabolicAcidosis: string
  muscularHypotonia: string
  stiffLimbs: string
  convulsion: string
  lethargy: string

  // Gastrointestinal
  giSymptoms: string
  poorFeeding: string
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
        return <DoctorInteractionPage onBack={() => handlePageChange(5)} />
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
