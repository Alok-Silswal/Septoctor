"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, Camera, Edit3, FileText, ArrowLeft } from "lucide-react"
import { useRef, useState } from "react"

interface DataInputPageProps {
  onManualEntry: () => void
  onBack: () => void
}

export function DataInputPage({ onManualEntry, onBack }: DataInputPageProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isProcessingFile, setIsProcessingFile] = useState(false)
  const [isCameraOpen, setIsCameraOpen] = useState(false)

  const handleFileUpload = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setIsProcessingFile(true)
      // Simulate OCR processing
      setTimeout(() => {
        setIsProcessingFile(false)
        alert(
          `File "${file.name}" uploaded successfully! OCR processing complete. Redirecting to form with pre-filled data.`,
        )
        onManualEntry() // Redirect to manual entry with pre-filled data
      }, 3000)
    }
  }

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
        stream.getTracks().forEach((track) => track.stop())
        setIsCameraOpen(false)
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
        <div className="mb-4 md:mb-6">
          <Button
            variant="ghost"
            onClick={onBack}
            className="text-white hover:text-white hover:bg-white/10 flex items-center gap-2 min-h-[44px]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Welcome</span>
            <span className="sm:hidden">Back</span>
          </Button>
        </div>

        <div className="text-center mb-6 md:mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">Data Input Options</h2>
          <p className="text-sm md:text-base text-white/80">Choose how you'd like to input the patient data</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Upload Case Sheet */}
          <Card className="hover:shadow-xl transition-all duration-300 border-0 bg-white/95 backdrop-blur-sm">
            <CardHeader className="text-center pb-3 md:pb-4">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4">
                <Upload className="w-6 h-6 md:w-8 md:h-8 text-white" />
              </div>
              <CardTitle className="text-lg md:text-xl">Upload Case Sheet</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="border-2 border-dashed border-muted rounded-lg p-4 md:p-8 mb-4 hover:border-primary transition-colors">
                <FileText className="w-8 h-8 md:w-12 md:h-12 text-muted-foreground mx-auto mb-3 md:mb-4" />
                <p className="text-xs md:text-sm text-muted-foreground mb-3 md:mb-4">
                  Drag & drop your case sheet here or click to browse
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  className="w-full bg-transparent min-h-[44px]"
                  onClick={handleFileUpload}
                  disabled={isProcessingFile}
                >
                  {isProcessingFile ? "Processing..." : "Choose File"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">OCR will extract data with editable preview</p>
            </CardContent>
          </Card>

          {/* Take Picture */}
          <Card className="hover:shadow-xl transition-all duration-300 border-0 bg-white/95 backdrop-blur-sm">
            <CardHeader className="text-center pb-3 md:pb-4">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-accent to-medical-teal rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4">
                <Camera className="w-6 h-6 md:w-8 md:h-8 text-white" />
              </div>
              <CardTitle className="text-lg md:text-xl">Take Picture</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="bg-muted rounded-lg p-4 md:p-8 mb-4">
                <Camera className="w-12 h-12 md:w-16 md:h-16 text-muted-foreground mx-auto mb-3 md:mb-4" />
                <p className="text-xs md:text-sm text-muted-foreground mb-3 md:mb-4">
                  Use your device camera to capture case sheet
                </p>
                <Button
                  className="w-full bg-gradient-to-r from-accent to-medical-teal min-h-[44px]"
                  onClick={handleCameraCapture}
                  disabled={isCameraOpen}
                >
                  {isCameraOpen ? "Opening Camera..." : "Open Camera"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Automatic text recognition from photos</p>
            </CardContent>
          </Card>

          {/* Manual Entry */}
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
  )
}