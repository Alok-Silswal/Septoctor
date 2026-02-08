"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Progress } from "@/components/ui/progress"
import { ArrowLeft } from "lucide-react"
import { useOCR } from "@/context/ocr-context"
import { parseOCRText } from "@/lib/ocr-parser"

import type { AssessmentData } from "@/app/page"
import {
  calculateMNRS,
  calculateHSS,
  calculateApgar1,
  calculateApgar5,
} from "@/lib/scoring"

interface AssessmentFormProps {
  onSubmit: (data: AssessmentData) => void
  onBack: () => void
}

// ========================================
// CRITICAL FIX: Sanitize function to convert undefined → null
// ========================================
function sanitizeForFirebase(data: any): any {
  const sanitized = { ...data }
  Object.keys(sanitized).forEach((key) => {
    if (sanitized[key] === undefined) {
      sanitized[key] = null
    } else if (typeof sanitized[key] === "number" && isNaN(sanitized[key])) {
      // Convert NaN to null as well
      sanitized[key] = null
    } else if (sanitized[key] && typeof sanitized[key] === "object" && !Array.isArray(sanitized[key])) {
      sanitized[key] = sanitizeForFirebase(sanitized[key])
    }
  })
  return sanitized
}

export function AssessmentForm({ onSubmit, onBack }: AssessmentFormProps) {
  const { ocrText } = useOCR()
  const prefillAppliedRef = useRef(false)

  const [formData, setFormData] = useState<Partial<AssessmentData>>({})
  const [prefillData, setPrefillData] = useState<Partial<AssessmentData>>({})
  
  // ========================================
  // FIX: Local state for numeric inputs
  // ========================================
  const [birthWeightInput, setBirthWeightInput] = useState<number | null>(null)
  const [gestAgeInput, setGestAgeInput] = useState<number | null>(null)
  
  const isPrefilled = (field: keyof AssessmentData) =>
    prefillData[field] !== undefined && formData[field] === prefillData[field]
  
  const [openSections, setOpenSections] = useState<string[]>(["section-a"])

  // Parse OCR text
  useEffect(() => {
    if (ocrText) {
      const parsed = parseOCRText(ocrText)
      setPrefillData(parsed)
    }
  }, [ocrText])

  // Apply prefill once
  useEffect(() => {
    if (!prefillAppliedRef.current && Object.keys(prefillData).length > 0) {
      setFormData((prev) => ({
        ...prev,
        ...prefillData,
      }))
      prefillAppliedRef.current = true
    }
  }, [prefillData])

  // ========================================
  // FIX: Sync OCR → numeric inputs
  // ========================================
  useEffect(() => {
    if (prefillData.birth_weight_category) {
      if (prefillData.birth_weight_category === "<1500 g") setBirthWeightInput(1200)
      else if (prefillData.birth_weight_category === "1500–2499 g") setBirthWeightInput(2000)
      else setBirthWeightInput(3000)
    }

    if (prefillData.gestational_age_category) {
      if (prefillData.gestational_age_category === "<34 weeks") setGestAgeInput(32)
      else if (prefillData.gestational_age_category === "34–36 weeks") setGestAgeInput(35)
      else setGestAgeInput(38)
    }
  }, [prefillData])

  const updateFormData = (field: string, value: string | number | null) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  // ========================================
  // Auto-compute APGAR totals from Section D components → Section B
  // ========================================
  useEffect(() => {
    const a1Fields = [
      formData.apgar1_appearance,
      formData.apgar1_pulse,
      formData.apgar1_grimace,
      formData.apgar1_activity,
      formData.apgar1_respiration,
    ]
    const filled1 = a1Fields.filter((v) => v !== undefined && v !== null && v !== "")
    if (filled1.length > 0) {
      const total = filled1.reduce((sum: number, v) => sum + Number(v), 0)
      setFormData((prev) => ({ ...prev, apgar_1_min: total }))
    }
  }, [
    formData.apgar1_appearance,
    formData.apgar1_pulse,
    formData.apgar1_grimace,
    formData.apgar1_activity,
    formData.apgar1_respiration,
  ])

  useEffect(() => {
    const a5Fields = [
      formData.apgar5_appearance,
      formData.apgar5_pulse,
      formData.apgar5_grimace,
      formData.apgar5_activity,
      formData.apgar5_respiration,
    ]
    const filled5 = a5Fields.filter((v) => v !== undefined && v !== null && v !== "")
    if (filled5.length > 0) {
      const total = filled5.reduce((sum: number, v) => sum + Number(v), 0)
      setFormData((prev) => ({ ...prev, apgar_5_min: total }))
    }
  }, [
    formData.apgar5_appearance,
    formData.apgar5_pulse,
    formData.apgar5_grimace,
    formData.apgar5_activity,
    formData.apgar5_respiration,
  ])

  // Whether APGAR totals are auto-computed from Section D
  const apgar1AutoFilled = [
    formData.apgar1_appearance, formData.apgar1_pulse, formData.apgar1_grimace,
    formData.apgar1_activity, formData.apgar1_respiration,
  ].some((v) => v !== undefined && v !== null && v !== "")

  const apgar5AutoFilled = [
    formData.apgar5_appearance, formData.apgar5_pulse, formData.apgar5_grimace,
    formData.apgar5_activity, formData.apgar5_respiration,
  ].some((v) => v !== undefined && v !== null && v !== "")

  const handleSubmit = () => {
    // ---------- VALIDATION START ----------
    const apgar1 = formData.apgar_1_min
    if (apgar1 !== undefined && apgar1 !== null && (apgar1 < 0 || apgar1 > 10)) {
      alert("APGAR score at 1 minute must be between 0 and 10.")
      return
    }

    const apgar5 = formData.apgar_5_min
    if (apgar5 !== undefined && apgar5 !== null && (apgar5 < 0 || apgar5 > 10)) {
      alert("APGAR score at 5 minutes must be between 0 and 10.")
      return
    }

    const temp = formData.temperature_celsius
    if (temp !== undefined && temp !== null && (temp < 30 || temp > 42)) {
      alert("Temperature looks invalid (30–42 °C). Please correct.")
      return
    }
    // ---------- VALIDATION END ----------

    const mnrsScore = calculateMNRS(formData)
    const hssScore = calculateHSS(formData)
    const apgar1Total = calculateApgar1(formData)
    const apgar5Total = calculateApgar5(formData)

    const submissionData = {
      ...formData,
      mnrs_score: mnrsScore,
      hss_score: hssScore,
      apgar1_total: apgar1Total,
      apgar5_total: apgar5Total,
    } as AssessmentData

    // ========================================
    // CRITICAL FIX: Sanitize before submitting
    // ========================================
    const sanitizedData = sanitizeForFirebase(submissionData)
    
    onSubmit(sanitizedData)
  }

  const YesNoRadio = ({ field, label }: { field: string; label: string }) => (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <RadioGroup
        value={formData[field as keyof AssessmentData] as string}
        onValueChange={(value: string) => updateFormData(field, value)}
        className="flex space-x-4"
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="yes" id={`${field}-yes`} />
          <Label htmlFor={`${field}-yes`}>Yes</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="no" id={`${field}-no`} />
          <Label htmlFor={`${field}-no`}>No</Label>
        </div>
      </RadioGroup>
    </div>
  )

  const totalSections = 4
  const completedSections =
    openSections.length > 0 ? Math.min(openSections.length, totalSections) : 1
  const progress = (completedSections / totalSections) * 100

  return (
    <div className="max-w-4xl mx-auto px-4">
      <div className="mb-4 md:mb-6">
        <Button
          variant="ghost"
          onClick={onBack}
          className="text-white hover:text-white hover:bg-white/10 flex items-center gap-2 min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Back to Data Input</span>
          <span className="sm:hidden">Back</span>
        </Button>
      </div>

      <div className="mb-6 md:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
          <h2 className="text-xl md:text-3xl font-bold text-white">
            Neonatal Sepsis Risk Assessment
          </h2>
          <div className="text-white/80 text-xs md:text-sm">
            {completedSections} of {totalSections} sections
          </div>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-xl">
        <CardContent className="p-4 md:p-6">
          <Accordion type="multiple" value={openSections} onValueChange={setOpenSections}>
            {/* Section A: Antenatal and Peripartum Risk Determinants */}
            <AccordionItem value="section-a">
              <AccordionTrigger className="text-base md:text-lg font-semibold">
                A. Antenatal and Peripartum Risk Determinants
              </AccordionTrigger>
              <AccordionContent className="space-y-4 md:space-y-6 pt-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                  <div>
                    <YesNoRadio field="prom_present" label="PROM Present" />
                    {isPrefilled("prom_present") && (
                      <p className="text-xs text-green-600 mt-1">Prefilled from OCR</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>PROM Duration (hours)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="240"
                      placeholder="Enter hours (0-240)"
                      value={formData.prom_duration_hours ?? ""}
                      className={isPrefilled("prom_duration_hours") ? "border-green-500" : ""}
                      onChange={(e) => {
                        const val = e.target.value === "" ? null : Number(e.target.value)
                        updateFormData("prom_duration_hours", val)
                      }}
                    />
                    {isPrefilled("prom_duration_hours") && (
                      <p className="text-xs text-green-600 mt-1">Prefilled from OCR</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Maternal Fever (°C)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="Enter temperature"
                      value={formData.maternal_fever_celsius ?? ""}
                      className={isPrefilled("maternal_fever_celsius") ? "border-green-500" : ""}
                      onChange={(e) => {
                        const val = e.target.value === "" ? null : Number(e.target.value)
                        updateFormData("maternal_fever_celsius", val)
                      }}
                    />
                    {isPrefilled("maternal_fever_celsius") && (
                      <p className="text-xs text-green-600 mt-1">Prefilled from OCR</p>
                    )}
                  </div>

                  <div>
                    <YesNoRadio field="chorioamnionitis" label="Chorioamnionitis" />
                    {isPrefilled("chorioamnionitis") && (
                      <p className="text-xs text-green-600 mt-1">Prefilled from OCR</p>
                    )}
                  </div>

                  <div>
                    <YesNoRadio field="foul_smelling_liquor" label="Foul Smelling Liquor" />
                    {isPrefilled("foul_smelling_liquor") && (
                      <p className="text-xs text-green-600 mt-1">Prefilled from OCR</p>
                    )}
                  </div>

                  <div>
                    <YesNoRadio field="prolonged_labor" label="Prolonged Labor" />
                    {isPrefilled("prolonged_labor") && (
                      <p className="text-xs text-green-600 mt-1">Prefilled from OCR</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>PV Examinations Count</Label>
                    <Input
                      type="number"
                      min="0"
                      max="20"
                      placeholder="Enter count (0-20)"
                      value={formData.pv_examinations_count ?? ""}
                      className={isPrefilled("pv_examinations_count") ? "border-green-500" : ""}
                      onChange={(e) => {
                        const val = e.target.value === "" ? null : Number(e.target.value)
                        updateFormData("pv_examinations_count", val)
                      }}
                    />
                    {isPrefilled("pv_examinations_count") && (
                      <p className="text-xs text-green-600 mt-1">Prefilled from OCR</p>
                    )}
                  </div>

                  <div>
                    <YesNoRadio field="unbooked_pregnancy" label="Unbooked Pregnancy" />
                    {isPrefilled("unbooked_pregnancy") && (
                      <p className="text-xs text-green-600 mt-1">Prefilled from OCR</p>
                    )}
                  </div>

                  <div>
                    <YesNoRadio field="maternal_uti_sti" label="Maternal UTI/STI" />
                    {isPrefilled("maternal_uti_sti") && (
                      <p className="text-xs text-green-600 mt-1">Prefilled from OCR</p>
                    )}
                  </div>

                  <div>
                    <YesNoRadio field="meconium_stained_liquor" label="Meconium Stained Liquor" />
                    {isPrefilled("meconium_stained_liquor") && (
                      <p className="text-xs text-green-600 mt-1">Prefilled from OCR</p>
                    )}
                  </div>

                  <div>
                    <YesNoRadio field="cotwin_iud" label="Co-twin IUD" />
                    {isPrefilled("cotwin_iud") && (
                      <p className="text-xs text-green-600 mt-1">Prefilled from OCR</p>
                    )}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Section B: Neonatal Constitutional and Perinatal Factors */}
            <AccordionItem value="section-b">
              <AccordionTrigger className="text-base md:text-lg font-semibold">
                B. Neonatal Constitutional and Perinatal Factors
              </AccordionTrigger>
              <AccordionContent className="space-y-4 md:space-y-6 pt-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                  {/* ========================================
                      FIX: Birth Weight Input - Now Editable
                      ======================================== */}
                  <div className="space-y-2">
                    <Label>Birth Weight (grams)</Label>
                    <Input
                      type="number"
                      min="300"
                      max="6000"
                      placeholder="Enter grams (300–6000)"
                      value={birthWeightInput ?? ""}
                      className={isPrefilled("birth_weight_category") ? "border-green-500" : ""}
                      onChange={(e) => {
                        const bw = e.target.value === "" ? null : Number(e.target.value)
                        setBirthWeightInput(bw)

                        let category: string | null = null
                        if (bw !== null) {
                          if (bw < 1500) category = "<1500 g"
                          else if (bw < 2500) category = "1500–2499 g"
                          else category = "≥2500 g"
                        }
                        updateFormData("birth_weight_category", category)
                      }}
                    />
                    {isPrefilled("birth_weight_category") && (
                      <p className="text-xs text-green-600 mt-1">Prefilled from OCR</p>
                    )}
                  </div>

                  {/* ========================================
                      FIX: Gestational Age Input - Now Editable
                      ======================================== */}
                  <div className="space-y-2">
                    <Label>Gestational Age (weeks)</Label>
                    <Input
                      type="number"
                      min="22"
                      max="44"
                      step="0.1"
                      value={gestAgeInput ?? ""}
                      className={isPrefilled("gestational_age_category") ? "border-green-500" : ""}
                      onChange={(e) => {
                        const ga = e.target.value === "" ? null : Number(e.target.value)
                        setGestAgeInput(ga)

                        let category: string | null = null
                        if (ga !== null) {
                          if (ga < 34) category = "<34 weeks"
                          else if (ga <= 36) category = "34–36 weeks"
                          else category = "≥37 weeks"
                        }
                        updateFormData("gestational_age_category", category)
                      }}
                    />
                    {isPrefilled("gestational_age_category") && (
                      <p className="text-xs text-green-600 mt-1">Prefilled from OCR</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Birth Weight Category</Label>
                    <Select value={formData.birth_weight_category ?? ""} disabled>
                      <SelectTrigger
                        className={isPrefilled("birth_weight_category") ? "border-green-500" : ""}
                      >
                        <SelectValue placeholder="Auto-calculated" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="<1500 g">&lt;1500 g</SelectItem>
                        <SelectItem value="1500–2499 g">1500–2499 g</SelectItem>
                        <SelectItem value="≥2500 g">≥2500 g</SelectItem>
                      </SelectContent>
                    </Select>
                    {isPrefilled("birth_weight_category") && (
                      <p className="text-xs text-green-600 mt-1">Prefilled from OCR</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Apgar Score (1 min)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="10"
                      value={formData.apgar_1_min ?? ""}
                      className={`${isPrefilled("apgar_1_min") ? "border-green-500" : ""} ${apgar1AutoFilled ? "bg-blue-50 border-blue-400" : ""}`}
                      readOnly={apgar1AutoFilled}
                      onChange={(e) => {
                        if (!apgar1AutoFilled) {
                          const val = e.target.value === "" ? null : Number(e.target.value)
                          updateFormData("apgar_1_min", val)
                        }
                      }}
                    />
                    {apgar1AutoFilled ? (
                      <p className="text-xs text-blue-600 mt-1">Auto-computed from Section D</p>
                    ) : isPrefilled("apgar_1_min") ? (
                      <p className="text-xs text-green-600 mt-1">Prefilled from OCR</p>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <Label>Apgar Score (5 min)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="10"
                      value={formData.apgar_5_min ?? ""}
                      className={`${isPrefilled("apgar_5_min") ? "border-green-500" : ""} ${apgar5AutoFilled ? "bg-blue-50 border-blue-400" : ""}`}
                      readOnly={apgar5AutoFilled}
                      onChange={(e) => {
                        if (!apgar5AutoFilled) {
                          const val = e.target.value === "" ? null : Number(e.target.value)
                          updateFormData("apgar_5_min", val)
                        }
                      }}
                    />
                    {apgar5AutoFilled ? (
                      <p className="text-xs text-blue-600 mt-1">Auto-computed from Section D</p>
                    ) : isPrefilled("apgar_5_min") ? (
                      <p className="text-xs text-green-600 mt-1">Prefilled from OCR</p>
                    ) : null}
                  </div>

                  <div>
                    <YesNoRadio field="resuscitation_required" label="Resuscitation Required" />
                    {isPrefilled("resuscitation_required") && (
                      <p className="text-xs text-green-600 mt-1">Prefilled from OCR</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Neonatal Sex</Label>
                    <Select
                      value={formData.neonatal_sex ?? ""}
                      onValueChange={(v) => updateFormData("neonatal_sex", v)}
                    >
                      <SelectTrigger
                        className={isPrefilled("neonatal_sex") ? "border-green-500" : ""}
                      >
                        <SelectValue placeholder="Select sex" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                    {isPrefilled("neonatal_sex") && (
                      <p className="text-xs text-green-600 mt-1">Prefilled from OCR</p>
                    )}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Section C: Early Postnatal Clinical Indicators (0-72 hours) */}
            <AccordionItem value="section-c">
              <AccordionTrigger className="text-base md:text-lg font-semibold">
                C. Early Postnatal Clinical Indicators (0–72 hours)
              </AccordionTrigger>
              <AccordionContent className="space-y-4 md:space-y-6 pt-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                  <div className="space-y-2">
                    <Label>Temperature (°C)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="30"
                      max="42"
                      value={formData.temperature_celsius ?? ""}
                      className={isPrefilled("temperature_celsius") ? "border-green-500" : ""}
                      onChange={(e) => {
                        const val = e.target.value === "" ? null : Number(e.target.value)
                        updateFormData("temperature_celsius", val)
                      }}
                    />
                    {isPrefilled("temperature_celsius") && (
                      <p className="text-xs text-green-600 mt-1">Prefilled from OCR</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Feeding Status</Label>
                    <Select
                      value={formData.feeding_status ?? ""}
                      onValueChange={(v) => updateFormData("feeding_status", v)}
                    >
                      <SelectTrigger
                        className={isPrefilled("feeding_status") ? "border-green-500" : ""}
                      >
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="poor">Poor</SelectItem>
                        <SelectItem value="absent">Absent</SelectItem>
                      </SelectContent>
                    </Select>
                    {isPrefilled("feeding_status") && (
                      <p className="text-xs text-green-600 mt-1">Prefilled from OCR</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Activity Level</Label>
                    <Select
                      value={formData.activity_level ?? ""}
                      onValueChange={(v) => updateFormData("activity_level", v)}
                    >
                      <SelectTrigger
                        className={isPrefilled("activity_level") ? "border-green-500" : ""}
                      >
                        <SelectValue placeholder="Select level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="lethargic">Lethargic</SelectItem>
                      </SelectContent>
                    </Select>
                    {isPrefilled("activity_level") && (
                      <p className="text-xs text-green-600 mt-1">Prefilled from OCR</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Respiratory Distress</Label>
                    <Select
                      value={formData.respiratory_distress ?? ""}
                      onValueChange={(v) => updateFormData("respiratory_distress", v)}
                    >
                      <SelectTrigger
                        className={isPrefilled("respiratory_distress") ? "border-green-500" : ""}
                      >
                        <SelectValue placeholder="Select severity" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="mild">Mild</SelectItem>
                        <SelectItem value="severe">Severe</SelectItem>
                      </SelectContent>
                    </Select>
                    {isPrefilled("respiratory_distress") && (
                      <p className="text-xs text-green-600 mt-1">Prefilled from OCR</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Heart Rate (bpm)</Label>
                    <Input
                      type="number"
                      min="60"
                      max="240"
                      value={formData.heart_rate_bpm ?? ""}
                      className={isPrefilled("heart_rate_bpm") ? "border-green-500" : ""}
                      onChange={(e) => {
                        const val = e.target.value === "" ? null : Number(e.target.value)
                        updateFormData("heart_rate_bpm", val)
                      }}
                    />
                    {isPrefilled("heart_rate_bpm") && (
                      <p className="text-xs text-green-600 mt-1">Prefilled from OCR</p>
                    )}
                  </div>

                  <div>
                    <YesNoRadio field="apnea_present" label="Apnea Present" />
                    {isPrefilled("apnea_present") && (
                      <p className="text-xs text-green-600 mt-1">Prefilled from OCR</p>
                    )}
                  </div>

                  <div>
                    <YesNoRadio field="shock_present" label="Shock Present" />
                    {isPrefilled("shock_present") && (
                      <p className="text-xs text-green-600 mt-1">Prefilled from OCR</p>
                    )}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Section D: Standardized Clinical Scoring Systems */}
            <AccordionItem value="section-d">
              <AccordionTrigger className="text-base md:text-lg font-semibold">
                D. Standardized Clinical Scoring Systems
              </AccordionTrigger>
              <AccordionContent className="space-y-4 md:space-y-6 pt-4">
                {/* D1. Hematologic Scoring System (HSS) */}
                <Card className="border-2">
                  <CardContent className="p-4 md:p-6">
                    <h3 className="text-base md:text-lg font-semibold mb-4">
                      D1. Hematologic Scoring System (HSS)
                    </h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                      <YesNoRadio
                        field="hss_tlc_abnormal"
                        label="Abnormal Total Leukocyte Count ( < 5000 or > 25000 cells/mm³ )"
                      />
                      <YesNoRadio field="hss_anc_abnormal" label="Abnormal Absolute Neutrophil Count" />
                      <YesNoRadio
                        field="hss_it_ratio_high"
                        label="Immature-to-Total Neutrophil Ratio > 0.2"
                      />
                      <YesNoRadio
                        field="hss_im_ratio_high"
                        label="Immature-to-Mature Neutrophil Ratio > 0.3"
                      />
                      <YesNoRadio field="hss_platelet_low" label="Platelet Count < 150,000/mm³" />
                      <YesNoRadio
                        field="hss_neutrophil_degeneration"
                        label="Degenerative Changes in Neutrophils"
                      />
                      <YesNoRadio
                        field="hss_nrbc_elevated"
                        label="Elevated Nucleated Red Blood Cells (NRBCs)"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* D2. APGAR Score */}
                <Card className="border-2">
                  <CardContent className="p-4 md:p-6">
                    <h3 className="text-base md:text-lg font-semibold mb-4">D2. APGAR Score</h3>

                    {/* APGAR at 1 minute */}
                    <div className="mb-6 pb-6 border-b">
                      <h4 className="text-sm md:text-base font-semibold mb-4">APGAR at 1 minute</h4>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                        <div className="space-y-2">
                          <Label>Appearance (0–2)</Label>
                          <Select
                            value={formData.apgar1_appearance ?? ""}
                            onValueChange={(value: string) => updateFormData("apgar1_appearance", value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select score" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0">0</SelectItem>
                              <SelectItem value="1">1</SelectItem>
                              <SelectItem value="2">2</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Pulse (0–2)</Label>
                          <Select
                            value={formData.apgar1_pulse ?? ""}
                            onValueChange={(value: string) => updateFormData("apgar1_pulse", value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select score" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0">0</SelectItem>
                              <SelectItem value="1">1</SelectItem>
                              <SelectItem value="2">2</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Grimace (0–2)</Label>
                          <Select
                            value={formData.apgar1_grimace ?? ""}
                            onValueChange={(value: string) => updateFormData("apgar1_grimace", value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select score" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0">0</SelectItem>
                              <SelectItem value="1">1</SelectItem>
                              <SelectItem value="2">2</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Activity (0–2)</Label>
                          <Select
                            value={formData.apgar1_activity ?? ""}
                            onValueChange={(value: string) => updateFormData("apgar1_activity", value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select score" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0">0</SelectItem>
                              <SelectItem value="1">1</SelectItem>
                              <SelectItem value="2">2</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Respiration (0–2)</Label>
                          <Select
                            value={formData.apgar1_respiration ?? ""}
                            onValueChange={(value: string) => updateFormData("apgar1_respiration", value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select score" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0">0</SelectItem>
                              <SelectItem value="1">1</SelectItem>
                              <SelectItem value="2">2</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* APGAR at 5 minutes */}
                    <div>
                      <h4 className="text-sm md:text-base font-semibold mb-4">APGAR at 5 minutes</h4>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                        <div className="space-y-2">
                          <Label>Appearance (0–2)</Label>
                          <Select
                            value={formData.apgar5_appearance ?? ""}
                            onValueChange={(value: string) => updateFormData("apgar5_appearance", value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select score" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0">0</SelectItem>
                              <SelectItem value="1">1</SelectItem>
                              <SelectItem value="2">2</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Pulse (0–2)</Label>
                          <Select
                            value={formData.apgar5_pulse ?? ""}
                            onValueChange={(value: string) => updateFormData("apgar5_pulse", value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select score" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0">0</SelectItem>
                              <SelectItem value="1">1</SelectItem>
                              <SelectItem value="2">2</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Grimace (0–2)</Label>
                          <Select
                            value={formData.apgar5_grimace ?? ""}
                            onValueChange={(value: string) => updateFormData("apgar5_grimace", value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select score" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0">0</SelectItem>
                              <SelectItem value="1">1</SelectItem>
                              <SelectItem value="2">2</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Activity (0–2)</Label>
                          <Select
                            value={formData.apgar5_activity ?? ""}
                            onValueChange={(value: string) => updateFormData("apgar5_activity", value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select score" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0">0</SelectItem>
                              <SelectItem value="1">1</SelectItem>
                              <SelectItem value="2">2</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Respiration (0–2)</Label>
                          <Select
                            value={formData.apgar5_respiration ?? ""}
                            onValueChange={(value: string) => updateFormData("apgar5_respiration", value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select score" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0">0</SelectItem>
                              <SelectItem value="1">1</SelectItem>
                              <SelectItem value="2">2</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div className="flex justify-center mt-6 md:mt-8 pt-4 md:pt-6 border-t">
            <Button
              type="button"
              onClick={handleSubmit}
              className="w-full sm:w-auto bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white px-8 md:px-12 py-3 text-base md:text-lg font-semibold shadow-lg min-h-[44px]"
              size="lg"
            >
              Submit Assessment
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
