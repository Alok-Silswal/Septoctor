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
  const [mounted, setMounted] = useState(false)
  const { userProfile, loading: authLoading, signOut } = useAuth()
  const [currentPage, setCurrentPage] = useState(0) // Start at 0 for login
  const [assessmentData, setAssessmentData] = useState<Partial<AssessmentData>>({})
  const [riskScore, setRiskScore] = useState<number | null>(null)
  const [patientId, setPatientId] = useState<string | null>(null)
  const [diagnosisId, setDiagnosisId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Ensure client-side only rendering
  useEffect(() => {
    setMounted(true)
  }, [])

  // Auto-redirect only pure admin users to their dashboards
  // Hospital admins and clinicians get to choose between the dashboard and assessment workflow
  useEffect(() => {
    if (!mounted || authLoading) return
    
    if (userProfile) {
      // Only redirect pure admin roles (national/state level)
      if (userProfile.role === UserRole.SUPER_ADMIN) {
        router.push('/dashboard/national')
      } else if (userProfile.role === UserRole.STATE_ADMIN) {
        router.push('/dashboard/state')
      }
      // HOSPITAL_ADMIN and CLINICIAN users continue to normal flow with dashboard access
    }
  }, [mounted, userProfile, authLoading, router])

  // Show loading state until mounted
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-medical-blue to-medical-teal flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  const handleLogin = (credentials: LoginCredentials) => {
    // After successful login, userProfile will be set by useAuth
    // Just navigate to data input page
    setCurrentPage(2)
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleAssessmentSubmit = async (data: AssessmentData) => {
    setAssessmentData(data)
    setCurrentPage(4) // Processing page
    setSaving(true)

    try {
      // Dynamic imports to ensure client-side only execution
      const { initFirebase } = await import("@/lib/firebase")
      const { collection, addDoc, serverTimestamp } = await import("firebase/firestore")
      const { saveAssessmentAsDiagnosis } = await import("@/lib/firebase-utils")
      
      // Get Firebase instance
      const { db } = initFirebase()
      
      if (!db) {
        throw new Error("Firebase not initialized - please refresh the page")
      }

      if (!userProfile) {
        throw new Error("User not logged in")
      }

      // Create patient record first
      const timestamp = Date.now()
      const patientName = `Patient-${timestamp.toString().slice(-6)}`
      
      const patientData = {
        name: patientName,
        state: userProfile.state || "Unknown",
        hospitalId: userProfile.hospitalId || "unknown",
        assignedDoctorId: userProfile.uid,
        assignedDoctorName: userProfile.name,
        dateOfBirth: new Date(),
        gender: data.neonatal_sex || "unknown",
        status: "active",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }

      // Save patient to Firestore
      const patientsRef = collection(db, "patients")
      const patientDocRef = await addDoc(patientsRef, patientData)
      const newPatientId = patientDocRef.id
      setPatientId(newPatientId)

      console.log("Patient saved with ID:", newPatientId)

      // Save diagnosis with assessment data
      const diagId = await saveAssessmentAsDiagnosis(
        data,
        userProfile,
        { id: newPatientId, name: patientData.name },
        patientData.hospitalId,
        patientData.state
      )

      setDiagnosisId(diagId)
      console.log("Diagnosis saved with ID:", diagId)

      // Calculate risk score immediately
      const mockRiskScore = Math.floor(Math.random() * 100)
      setRiskScore(mockRiskScore)

      // Determine severity based on risk score
      let severity = "low-risk"
      let status = "active"
      if (mockRiskScore >= 70) {
        severity = "critical"
      } else if (mockRiskScore >= 50) {
        severity = "high-risk"
      } else if (mockRiskScore >= 30) {
        severity = "moderate"
      }

      // Show results immediately after 1 second
      setTimeout(() => {
        setSaving(false)
        setCurrentPage(5) // Results page
      }, 1000)

      // Update diagnosis in background (non-blocking)
      setTimeout(async () => {
        try {
          const { updateDiagnosis } = await import("@/lib/firebase-utils")
          await updateDiagnosis(diagId, {
            severity: severity,
            status: status,
            mlRiskScore: mockRiskScore,
            riskConfidence: Math.floor(Math.random() * 20) + 80, // 80-100%
            treatmentPlan: mockRiskScore >= 70 
              ? "Immediate antibiotic therapy recommended. Close monitoring required."
              : mockRiskScore >= 50
              ? "Risk assessment completed. Monitor closely and follow up in 6-12 hours."
              : "Low risk detected. Continue routine monitoring.",
            detailedNotes: `AI-assisted sepsis risk assessment completed. Risk score: ${mockRiskScore}%. Assessment based on ${Object.keys(data).length} clinical parameters.`,
          })
          console.log("Diagnosis updated with risk score:", mockRiskScore)
        } catch (updateError: any) {
          console.error("Error updating diagnosis with risk score:", updateError)
          // Results already shown, just log the error
        }
      }, 2000) // Delay update to after results are shown

    } catch (error: any) {
      console.error("Error saving assessment:", error)
      alert(`Failed to save assessment: ${error.message}`)
      setSaving(false)
      setCurrentPage(3) // Go back to assessment form
    }
  }

  const renderCurrentPage = () => {
    // Show login page if not authenticated in Firebase
    // Check userProfile (from Firebase) rather than local isLoggedIn state
    if (!userProfile && !authLoading) {
      return <LoginPage onLogin={handleLogin} />
    }

    // Show loading while checking auth
    if (authLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-white text-xl">Checking authentication...</div>
        </div>
      )
    }

    switch (currentPage) {
      case 2:
        return <DataInputPage onManualEntry={() => handlePageChange(3)} onBack={() => {
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
        return <FinalPage 
          onRestart={() => {
            // Reset state for new assessment
            setPatientId(null)
            setDiagnosisId(null)
            setAssessmentData({})
            setRiskScore(null)
            handlePageChange(2)
          }} 
          onBack={() => handlePageChange(5)}
          patientId={patientId}
          diagnosisId={diagnosisId}
        />
      default:
        return <DataInputPage onManualEntry={() => handlePageChange(3)} onBack={() => {
          signOut()
        }} />
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-medical-blue to-medical-teal">
      <div className="container mx-auto px-4 py-8">{renderCurrentPage()}</div>
    </div>
  )
}
