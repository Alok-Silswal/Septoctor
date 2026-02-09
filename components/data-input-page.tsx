"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, Camera, Edit3, FileText, ArrowLeft, Database, FileImage, LayoutDashboard } from "lucide-react"
import { useRef, useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { UserRole } from "@/lib/rbac"
import { useRouter } from "next/navigation"
import { useOCR } from "@/context/ocr-context"

interface DataInputPageProps {
  onManualEntry: () => void
  onBack: () => void
}

// Helper function to check if file is structured data
const isStructuredFile = (filename: string): boolean => {
  const ext = filename.toLowerCase().split('.').pop()
  return ['csv', 'json'].includes(ext || '') // Removed 'xlsx' for now
}

// Helper function to check if file is unstructured document
const isUnstructuredFile = (filename: string): boolean => {
  const ext = filename.toLowerCase().split('.').pop()
  return ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx', 'txt'].includes(ext || '')
}

// Parse structured file and extract field mappings
const parseStructuredFile = async (file: File): Promise<{ data: any; isValid: boolean; message: string }> => {
  const ext = file.name.toLowerCase().split('.').pop()

  try {
    if (ext === 'json') {
      const text = await file.text()
      const data = JSON.parse(text)
      return validateAndMapFields(data, 'json')
    } else if (ext === 'csv') {
      const text = await file.text()
      const lines = text.trim().split('\n')
      
      if (lines.length < 2) {
        return { data: null, isValid: false, message: 'CSV file must contain at least a header row and one data row.' }
      }

      // Check for multiple records
      if (lines.length > 2) {
        return { data: null, isValid: false, message: `File contains ${lines.length - 1} records. Please upload a file with only one patient record.` }
      }

      // Parse CSV - simple implementation (handles basic cases)
      const headers = lines[0].split(',').map(h => h.trim().replace(/['"]/g, ''))
      const values = lines[1].split(',').map(v => v.trim().replace(/['"]/g, ''))
      
      const data: any = {}
      headers.forEach((header, index) => {
        data[header] = values[index]
      })
      
      return validateAndMapFields(data, 'csv')
    }
  } catch (error) {
    return { data: null, isValid: false, message: `Error parsing file: ${error}` }
  }

  return { data: null, isValid: false, message: 'Unsupported file format' }
}

// Validate and map fields from structured data
const validateAndMapFields = (rawData: any, format: string): { data: any; isValid: boolean; message: string } => {
  // Field mapping: maps common field names to our form field names
  const fieldMappings: { [key: string]: string[] } = {
    // Section A: Antenatal and Peripartum
    'prom_present': ['prom_present', 'prom', 'rupture_of_membranes', 'rom_present'],
    'prom_duration_hours': ['prom_duration_hours', 'prom_duration', 'rom_duration', 'rupture_duration'],
    'maternal_fever_celsius': ['maternal_fever_celsius', 'maternal_fever', 'mother_fever', 'fever_temp'],
    'chorioamnionitis': ['chorioamnionitis', 'chorio', 'amnionitis'],
    'foul_smelling_liquor': ['foul_smelling_liquor', 'foul_liquor', 'bad_smell_liquor'],
    'prolonged_labor': ['prolonged_labor', 'long_labor', 'extended_labor'],
    'pv_examinations_count': ['pv_examinations_count', 'pv_count', 'vaginal_exam_count', 'pv_exams'],
    'unbooked_pregnancy': ['unbooked_pregnancy', 'unbooked', 'no_anc'],
    'maternal_uti_sti': ['maternal_uti_sti', 'uti', 'sti', 'maternal_infection'],
    'meconium_stained_liquor': ['meconium_stained_liquor', 'meconium', 'stained_liquor'],
    'cotwin_iud': ['cotwin_iud', 'twin_death', 'cotwin_death'],

    // Section B: Neonatal Constitutional
    'birth_weight_grams': ['birth_weight', 'weight', 'birth_weight_grams', 'bw'],
    'gestational_age_weeks': ['gestational_age', 'ga', 'gestational_age_weeks', 'gestation'],
    'apgar_1_min': ['apgar_1_min', 'apgar1', 'apgar_1', 'apgar_one_min'],
    'apgar_5_min': ['apgar_5_min', 'apgar5', 'apgar_5', 'apgar_five_min'],
    'resuscitation_required': ['resuscitation_required', 'resuscitation', 'resus_required'],
    'neonatal_sex': ['neonatal_sex', 'sex', 'gender', 'baby_sex'],

    // Section C: Early Postnatal
    'temperature_celsius': ['temperature_celsius', 'temperature', 'temp', 'body_temp'],
    'feeding_status': ['feeding_status', 'feeding', 'feed_status'],
    'activity_level': ['activity_level', 'activity', 'alertness'],
    'respiratory_distress': ['respiratory_distress', 'breathing_distress', 'resp_distress'],
    'heart_rate_bpm': ['heart_rate_bpm', 'heart_rate', 'hr', 'pulse'],
    'apnea_present': ['apnea_present', 'apnea', 'breathing_pause'],
    'shock_present': ['shock_present', 'shock', 'circulatory_shock'],

    // Section D: HSS
    'hss_tlc_abnormal': ['hss_tlc_abnormal', 'tlc_abnormal', 'wbc_abnormal'],
    'hss_anc_abnormal': ['hss_anc_abnormal', 'anc_abnormal', 'neutrophil_abnormal'],
    'hss_it_ratio_high': ['hss_it_ratio_high', 'it_ratio_high', 'immature_ratio'],
    'hss_im_ratio_high': ['hss_im_ratio_high', 'im_ratio_high'],
    'hss_platelet_low': ['hss_platelet_low', 'platelet_low', 'low_platelets'],
    'hss_neutrophil_degeneration': ['hss_neutrophil_degeneration', 'neutrophil_degeneration', 'toxic_changes'],
    'hss_nrbc_elevated': ['hss_nrbc_elevated', 'nrbc_elevated', 'nucleated_rbc'],
  }

  const mappedData: any = {}
  let mappedCount = 0

  // Check if raw data is an array (multiple records)
  if (Array.isArray(rawData)) {
    if (rawData.length === 0) {
      return { data: null, isValid: false, message: 'File is empty.' }
    }
    if (rawData.length > 1) {
      return { data: null, isValid: false, message: `File contains ${rawData.length} records. Please upload a file with only one patient record.` }
    }
    // If it's a single-element array, unwrap it
    rawData = rawData[0]
  }

  // Normalize raw data keys (lowercase, remove spaces/underscores)
  const normalizedRawData: any = {}
  Object.keys(rawData).forEach(key => {
    const normalizedKey = key.toLowerCase().trim().replace(/[\s-]/g, '_')
    normalizedRawData[normalizedKey] = rawData[key]
  })

  // Try to map fields
  Object.keys(fieldMappings).forEach(targetField => {
    const possibleKeys = fieldMappings[targetField]
    
    for (const key of possibleKeys) {
      if (normalizedRawData[key] !== undefined) {
        let value = normalizedRawData[key]
        
        // Convert yes/no strings to proper format
        if (typeof value === 'string') {
          const lowerValue = value.toLowerCase().trim()
          if (['yes', 'y', 'true', '1'].includes(lowerValue)) {
            value = 'yes'
          } else if (['no', 'n', 'false', '0'].includes(lowerValue)) {
            value = 'no'
          }
        }
        
        // Convert numeric strings to numbers where appropriate
        if (targetField.includes('hours') || targetField.includes('count') || 
            targetField.includes('celsius') || targetField.includes('bpm') ||
            targetField.includes('apgar') || targetField.includes('grams') ||
            targetField.includes('weeks')) {
          const numValue = parseFloat(value)
          if (!isNaN(numValue)) {
            value = numValue
          }
        }

        mappedData[targetField] = value
        mappedCount++
        break
      }
    }
  })

  // Auto-calculate categories from raw values
  if (mappedData.birth_weight_grams) {
    const bw = mappedData.birth_weight_grams
    if (bw < 1500) mappedData.birth_weight_category = '<1500 g'
    else if (bw < 2500) mappedData.birth_weight_category = '1500–2499 g'
    else mappedData.birth_weight_category = '≥2500 g'
  }

  if (mappedData.gestational_age_weeks) {
    const ga = mappedData.gestational_age_weeks
    if (ga < 34) mappedData.gestational_age_category = '<34 weeks'
    else if (ga <= 36) mappedData.gestational_age_category = '34–36 weeks'
    else mappedData.gestational_age_category = '≥37 weeks'
  }

  // Validation: Check if we mapped at least some relevant fields
  if (mappedCount === 0) {
    return {
      data: null,
      isValid: false,
      message: 'No valid patient data fields found in file. Please ensure the file contains medical assessment fields like birth_weight, gestational_age, apgar scores, etc.'
    }
  }

  return {
    data: mappedData,
    isValid: true,
    message: `Successfully mapped ${mappedCount} fields from ${format.toUpperCase()} file`
  }
}

// Check if document is relevant using keyword heuristics
const isRelevantDocument = async (file: File): Promise<boolean> => {
  const filename = file.name.toLowerCase()
  const allowKeywords = ['case', 'patient', 'medical', 'report', 'sepsis', 'neonatal', 'sheet', 'lab', 'scan']
  const blockKeywords = ['holiday', 'vacation', 'selfie', 'wallpaper', 'music', 'song']

  if (blockKeywords.some((keyword) => filename.includes(keyword))) return false
  if (allowKeywords.some((keyword) => filename.includes(keyword))) return true

  return true
}

// Convert file to Base64 (for OCR)
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.split(",")[1])
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function DataInputPage({ onManualEntry, onBack }: DataInputPageProps) {
  const router = useRouter()
  const { userProfile } = useAuth()

  const { setOcrText } = useOCR()

  const structuredFileInputRef = useRef<HTMLInputElement>(null)
  const unstructuredFileInputRef = useRef<HTMLInputElement>(null)
  const [isProcessingStructured, setIsProcessingStructured] = useState(false)
  const [isProcessingUnstructured, setIsProcessingUnstructured] = useState(false)
  // Camera state commented out for future use
  // const [isCameraOpen, setIsCameraOpen] = useState(false)

  // Handle dashboard navigation
  const handleRunDrift = async () => {
    try {
      await fetch("/api/run-drift", { method: "POST" })
      window.open("http://localhost:8000/drift-report", "_blank")
    } catch (error) {
      alert("Failed to run data drift check")
      console.error(error)
    }
  }
  const handleGoToDashboard = () => {
    if (userProfile?.role === UserRole.HOSPITAL_ADMIN) {
      router.push('/dashboard/hospital')
    } else if (userProfile?.role === UserRole.CLINICIAN) {
      router.push('/dashboard/clinician')
    }
  }

  // Option 1: Structured Data Upload Handler (CSV/JSON)
  const handleStructuredFileUpload = () => {
    structuredFileInputRef.current?.click()
  }

  const handleStructuredFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validation: Check file type
    if (!isStructuredFile(file.name)) {
      alert('Invalid file type. Please upload a CSV or JSON file.')
      event.target.value = ''
      return
    }

    // Validation: Check file size (≤ 1 MB)
    const maxSize = 1 * 1024 * 1024 // 1 MB
    if (file.size > maxSize) {
      alert('File size exceeds 1 MB limit. Please upload a smaller file.')
      event.target.value = ''
      return
    }

    setIsProcessingStructured(true)

    try {
      // Parse and validate structured file
      const result = await parseStructuredFile(file)

      if (!result.isValid) {
        alert(result.message)
        event.target.value = ''
        return
      }

      // Store parsed data as JSON string in OCR context
      // The OCR parser will detect it's JSON and handle accordingly
      const structuredDataString = JSON.stringify(result.data)
      setOcrText(structuredDataString)

      alert(result.message + '\n\nRedirecting to form with pre-filled data.')
      onManualEntry()
    } catch (error) {
      console.error('Error processing structured file:', error)
      alert('Failed to process file. Please check the file format and try again.')
    } finally {
      setIsProcessingStructured(false)
      event.target.value = ''
    }
  }

  // Option 2A: Unstructured Document Upload Handler
  const handleUnstructuredFileUpload = () => {
    unstructuredFileInputRef.current?.click()
  }

  const handleUnstructuredFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validation: Check file type
    if (!isUnstructuredFile(file.name)) {
      alert('Invalid file type. Please upload a PDF, image, DOC/DOCX, or TXT file.')
      event.target.value = ''
      return
    }

    // Validation: Check file size (≤ 3 MB)
    const maxSize = 3 * 1024 * 1024 // 3 MB
    if (file.size > maxSize) {
      alert('File size exceeds 3 MB limit. Please upload a smaller file.')
      event.target.value = ''
      return
    }

    // Validation: Check content relevance (placeholder logic)
    const isRelevant = await isRelevantDocument(file)
    if (!isRelevant) {
      alert('File appears to be irrelevant. Please upload a medical case sheet or patient report.')
      event.target.value = ''
      return
    }

    // All validations passed - proceed with OCR
    setIsProcessingUnstructured(true)

    try {
      const base64 = await fileToBase64(file)

      const res = await fetch("/api/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64 }),
      })

      if (!res.ok) {
        throw new Error("OCR request failed")
      }

      const data = await res.json()
      setOcrText(data.text)

      alert("OCR processing complete. Redirecting to form with extracted data.")
      onManualEntry()
    } catch (err) {
      console.error("OCR failed:", err)
      alert("OCR failed. Please try again or use manual entry.")
    } finally {
      setIsProcessingUnstructured(false)
      event.target.value = ''
    }
  }

  // ============================================
  // COMMENTED OUT: Camera Capture Handler
  // Keeping for future implementation
  // ============================================
  /*
  const handleCameraCapture = async () => {
    try {
      setIsCameraOpen(true)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      })

      const video = document.createElement("video")
      video.srcObject = stream
      video.play()

      setTimeout(() => {
        const width = video.videoWidth || 1920
        const height = video.videoHeight || 1080
        const estimatedSize = (width * height * 3) / 10

        stream.getTracks().forEach((track) => track.stop())
        setIsCameraOpen(false)

        const maxSize = 2 * 1024 * 1024 // 2 MB
        if (estimatedSize > maxSize) {
          alert('Captured image size exceeds 2 MB limit. Please try again with lower resolution or better lighting.')
          return
        }

        alert("Photo captured successfully! Processing with OCR. Redirecting to form with extracted data.")
        onManualEntry()
      }, 3000)
    } catch (error) {
      console.error("Camera access denied:", error)
      setIsCameraOpen(false)
      alert("Camera access denied. Please allow camera permissions or use file upload instead.")
    }
  }
  */

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-4xl mx-auto">
        <div className="mb-4 md:mb-6 flex justify-between items-center gap-2">
          <Button
            variant="ghost"
            onClick={onBack}
            className="text-white hover:text-white hover:bg-white/10 flex items-center gap-2 min-h-[44px]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Welcome</span>
            <span className="sm:hidden">Back</span>
          </Button>

          {/* Dashboard button for Hospital Admin and Clinician */}
          {userProfile && (userProfile.role === UserRole.HOSPITAL_ADMIN || userProfile.role === UserRole.CLINICIAN) && (
            <Button
              variant="outline"
              onClick={handleGoToDashboard}
              className="bg-white/10 text-white hover:bg-white/20 hover:text-white border-white/30 flex items-center gap-2 min-h-[44px]"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span className="hidden sm:inline">Go to Dashboard</span>
              <span className="sm:hidden">Dashboard</span>
            </Button>
          )}
        </div>

        <div className="text-center mb-6 md:mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">Data Input Options</h2>
          <p className="text-sm md:text-base text-white/80">Choose the appropriate input method for your data</p>
        </div>

        <div className="space-y-6 md:space-y-8">
          {/* Option 1: Structured Data Upload */}
          <div>
            <h3 className="text-lg md:text-xl font-semibold text-white mb-3 md:mb-4">Option 1: Structured Data Upload</h3>
            <Card className="hover:shadow-xl transition-all duration-300 border-0 bg-white/95 backdrop-blur-sm">
              <CardHeader className="text-center pb-3 md:pb-4">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4">
                  <Database className="w-6 h-6 md:w-8 md:h-8 text-white" />
                </div>
                <CardTitle className="text-lg md:text-xl">Upload Structured Data</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <div className="border-2 border-dashed border-muted rounded-lg p-4 md:p-8 mb-4 hover:border-blue-500 transition-colors">
                  <Database className="w-8 h-8 md:w-12 md:h-12 text-muted-foreground mx-auto mb-3 md:mb-4" />
                  <p className="text-xs md:text-sm text-muted-foreground mb-2">
                    Upload structured patient data files
                  </p>
                  <p className="text-xs text-muted-foreground/70 mb-3 md:mb-4">
                    Accepted: CSV, JSON • Max 1 MB • Single record only
                  </p>
                  <input
                    ref={structuredFileInputRef}
                    type="file"
                    accept=".csv,.json"
                    onChange={handleStructuredFileChange}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    className="w-full bg-transparent min-h-[44px] border-blue-500 text-blue-600 hover:bg-blue-50"
                    onClick={handleStructuredFileUpload}
                    disabled={isProcessingStructured}
                  >
                    {isProcessingStructured ? "Processing..." : "Choose Structured File"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Direct data import with validation</p>
              </CardContent>
            </Card>
          </div>

          {/* Option 2: Unstructured Input - NOW EXPANDED */}
          <div>
            <h3 className="text-lg md:text-xl font-semibold text-white mb-3 md:mb-4">Option 2: Unstructured Document Input</h3>
            <Card className="hover:shadow-xl transition-all duration-300 border-0 bg-white/95 backdrop-blur-sm">
              <CardHeader className="text-center pb-3 md:pb-4">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4">
                  <FileImage className="w-6 h-6 md:w-8 md:h-8 text-white" />
                </div>
                <CardTitle className="text-lg md:text-xl">Upload Document</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <div className="border-2 border-dashed border-muted rounded-lg p-4 md:p-8 mb-4 hover:border-primary transition-colors">
                  <FileText className="w-8 h-8 md:w-12 md:h-12 text-muted-foreground mx-auto mb-3 md:mb-4" />
                  <p className="text-xs md:text-sm text-muted-foreground mb-2">
                    Upload case sheet or medical report
                  </p>
                  <p className="text-xs text-muted-foreground/70 mb-3 md:mb-4">
                    PDF, Images, DOC/DOCX, TXT • Max 3 MB
                  </p>
                  <input
                    ref={unstructuredFileInputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.txt"
                    onChange={handleUnstructuredFileChange}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    className="w-full bg-transparent min-h-[44px]"
                    onClick={handleUnstructuredFileUpload}
                    disabled={isProcessingUnstructured}
                  >
                    {isProcessingUnstructured ? "Processing..." : "Choose Document"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">OCR extraction with validation</p>
              </CardContent>
            </Card>
          </div>

          {/* Option 3: Manual Entry */}
          <div>
            <h3 className="text-lg md:text-xl font-semibold text-white mb-3 md:mb-4">Option 3: Manual Entry</h3>
            <Card className="hover:shadow-xl transition-all duration-300 border-0 bg-white/95 backdrop-blur-sm ring-2 ring-primary/20">
              <CardHeader className="text-center pb-3 md:pb-4">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-medical-teal to-primary rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4">
                  <Edit3 className="w-6 h-6 md:w-8 md:h-8 text-white" />
                </div>
                <CardTitle className="text-lg md:text-xl">Manual Entry</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <div className="bg-gradient-to-br from-primary/5 to-accent/5 rounded-lg p-4 md:p-8 mb-4">
                  <Edit3 className="w-12 h-12 md:w-16 md:h-16 text-primary mx-auto mb-3 md:mb-4" />
                  <p className="text-xs md:text-sm text-muted-foreground mb-3 md:mb-4">
                    Fill out the assessment form manually
                  </p>
                  <Button onClick={onManualEntry} className="w-full bg-gradient-to-r from-primary to-accent min-h-[44px]">
                    Start Manual Entry
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Comprehensive step-by-step form</p>
              </CardContent>
            </Card>
          </div>
         <button
  type="button"
  onClick={handleRunDrift}
  className="mt-4 px-4 py-2 rounded bg-purple-600 text-white hover:bg-purple-700"
>
  Run Data Drift Check
</button>

        </div>
      </div>
    </div>
  )
}
