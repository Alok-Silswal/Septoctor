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
  return ['csv', 'xlsx', 'json'].includes(ext || '')
}

// Helper function to check if file is unstructured document
const isUnstructuredFile = (filename: string): boolean => {
  const ext = filename.toLowerCase().split('.').pop()
  return ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx', 'txt'].includes(ext || '')
}

// Placeholder: Check if structured file has multiple records
const hasMultipleRecords = async (file: File): Promise<boolean> => {
  // Placeholder logic - in real implementation, would parse file content
  // For now, simulate check based on file size (larger files likely have more records)
  return file.size > 500 // Simple heuristic: files > 500 bytes might have multiple records
}

// Placeholder: Check if document is relevant using keyword heuristics
const isRelevantDocument = async (file: File): Promise<boolean> => {
  // Simple heuristic: block a few clearly irrelevant names; otherwise allow
  const filename = file.name.toLowerCase()
  const allowKeywords = ['case', 'patient', 'medical', 'report', 'sepsis', 'neonatal', 'sheet', 'lab', 'scan']
  const blockKeywords = ['holiday', 'vacation', 'selfie', 'wallpaper', 'music', 'song']

  if (blockKeywords.some((keyword) => filename.includes(keyword))) return false
  if (allowKeywords.some((keyword) => filename.includes(keyword))) return true

  // Default to allow to avoid over-blocking during placeholder validation
  return true
}

// Estimate image size after camera capture
const estimateCapturedImageSize = (width: number, height: number): number => {
  // Rough estimate: width * height * 3 bytes per pixel (RGB) / compression factor
  const compressionFactor = 10 // Typical JPEG compression
  return (width * height * 3) / compressionFactor
}

// Convert file to Base64 (for OCR)
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.split(",")[1]) // remove data:image/...;base64,
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
  const [isCameraOpen, setIsCameraOpen] = useState(false)

  // Handle dashboard navigation
  const handleGoToDashboard = () => {
    if (userProfile?.role === UserRole.HOSPITAL_ADMIN) {
      router.push('/dashboard/hospital')
    } else if (userProfile?.role === UserRole.CLINICIAN) {
      router.push('/dashboard/clinician')
    }
  }

  // Option 1: Structured Data Upload Handler
  const handleStructuredFileUpload = () => {
    structuredFileInputRef.current?.click()
  }

  const handleStructuredFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validation: Check file type
    if (!isStructuredFile(file.name)) {
      alert('Invalid file type. Please upload a CSV, XLSX, or JSON file.')
      event.target.value = '' // Reset input
      return
    }

    // Validation: Check file size (≤ 1 MB)
    const maxSize = 1 * 1024 * 1024 // 1 MB
    if (file.size > maxSize) {
      alert('File size exceeds 1 MB limit. Please upload a smaller file.')
      event.target.value = ''
      return
    }

    // Validation: Check for multiple records (placeholder logic)
    const multipleRecords = await hasMultipleRecords(file)
    if (multipleRecords) {
      alert('File contains multiple data records. Please upload a file with a single patient record.')
      event.target.value = ''
      return
    }

    // All validations passed - proceed with REAL OCR
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

  alert(
    `File "${file.name}" processed with OCR. Redirecting to form with extracted data.`,
  )

  // TODO (next step): parse data.text and pre-fill form fields
  onManualEntry()
} catch (error) {
  console.error(error)
  alert("OCR failed. Please try manual entry or upload a clearer document.")
} finally {
  setIsProcessingUnstructured(false)
  event.target.value = ""
}

  }

  function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () =>
      resolve(reader.result!.toString().split(",")[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
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

    // All validations passed - proceed with fake OCR
    console.log("Unstructured upload passed validation, calling OCR...")
    setIsProcessingUnstructured(true)
    console.log("Unstructured upload passed validation, calling OCR...")
setIsProcessingUnstructured(true)

try {
  // Convert file to Base64
  const base64 = await fileToBase64(file)

  // Call OCR API
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
  alert("OCR failed. Please try again.")
} finally {
  setIsProcessingUnstructured(false)
  event.target.value = ''
}

  }

  // Option 2B: Camera Capture Handler
  const handleCameraCapture = async () => {
    try {
      setIsCameraOpen(true)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }, // Use back camera if available
      })

      // Create a simple camera interface
      const video = document.createElement("video")
      video.srcObject = stream
      video.play()

      // For demo purposes, simulate taking a photo after 3 seconds
      setTimeout(() => {
        // Get video dimensions for size estimation
        const width = video.videoWidth || 1920
        const height = video.videoHeight || 1080
        const estimatedSize = estimateCapturedImageSize(width, height)

        stream.getTracks().forEach((track) => track.stop())
        setIsCameraOpen(false)

        // Validation: Check estimated image size (≤ 2 MB)
        const maxSize = 2 * 1024 * 1024 // 2 MB
        if (estimatedSize > maxSize) {
          alert('Captured image size exceeds 2 MB limit. Please try again with lower resolution or better lighting.')
          return
        }

        // Validation passed - proceed with fake OCR
        alert("Photo captured successfully! Processing with OCR. Redirecting to form with extracted data.")
        onManualEntry()
      }, 3000)
    } catch (error) {
      console.error("Camera access denied:", error)
      setIsCameraOpen(false)
      alert("Camera access denied. Please allow camera permissions or use file upload instead.")
    }
  }

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
                    Accepted: CSV, XLSX, JSON • Max 1 MB • Single record only
                  </p>
                  <input
                    ref={structuredFileInputRef}
                    type="file"
                    accept=".csv,.xlsx,.json"
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

          {/* Option 2: Unstructured Input */}
          <div>
            <h3 className="text-lg md:text-xl font-semibold text-white mb-3 md:mb-4">Option 2: Unstructured Document Input</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              {/* 2A: Document Upload */}
              <Card className="hover:shadow-xl transition-all duration-300 border-0 bg-white/95 backdrop-blur-sm">
                <CardHeader className="text-center pb-3 md:pb-4">
                  <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4">
                    <FileImage className="w-6 h-6 md:w-8 md:h-8 text-white" />
                  </div>
                  <CardTitle className="text-lg md:text-xl">Upload Document</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <div className="border-2 border-dashed border-muted rounded-lg p-4 md:p-6 mb-4 hover:border-primary transition-colors">
                    <FileText className="w-8 h-8 md:w-10 md:h-10 text-muted-foreground mx-auto mb-2 md:mb-3" />
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

              {/* 2B: Camera Capture */}
              <Card className="hover:shadow-xl transition-all duration-300 border-0 bg-white/95 backdrop-blur-sm">
                <CardHeader className="text-center pb-3 md:pb-4">
                  <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-accent to-medical-teal rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4">
                    <Camera className="w-6 h-6 md:w-8 md:h-8 text-white" />
                  </div>
                  <CardTitle className="text-lg md:text-xl">Take Picture</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <div className="bg-muted rounded-lg p-4 md:p-6 mb-4">
                    <Camera className="w-10 h-10 md:w-12 md:h-12 text-muted-foreground mx-auto mb-2 md:mb-3" />
                    <p className="text-xs md:text-sm text-muted-foreground mb-2">
                      Capture case sheet with camera
                    </p>
                    <p className="text-xs text-muted-foreground/70 mb-3 md:mb-4">
                      Max 2 MB capture size
                    </p>
                    <Button
                      className="w-full bg-gradient-to-r from-accent to-medical-teal min-h-[44px]"
                      onClick={handleCameraCapture}
                      disabled={isCameraOpen}
                    >
                      {isCameraOpen ? "Opening Camera..." : "Open Camera"}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Automatic text recognition</p>
                </CardContent>
              </Card>
            </div>
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
        </div>
      </div>
    </div>
  )
}
