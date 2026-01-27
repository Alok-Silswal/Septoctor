"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Progress } from "@/components/ui/progress"
import { ArrowLeft } from "lucide-react"
import type { AssessmentData } from "@/app/page"

interface AssessmentFormProps {
  onSubmit: (data: AssessmentData) => void
  onBack: () => void
}

export function AssessmentForm({ onSubmit, onBack }: AssessmentFormProps) {
  const [formData, setFormData] = useState<Partial<AssessmentData>>({})
  const [openSections, setOpenSections] = useState<string[]>(["neonatal-info"])

  const updateFormData = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = () => {
    onSubmit(formData as AssessmentData)
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
  const completedSections = openSections.length > 0 ? Math.min(openSections.length, totalSections) : 1
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
          <h2 className="text-xl md:text-3xl font-bold text-white">Neonatal Sepsis Risk Assessment</h2>
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
                  <YesNoRadio field="prom_present" label="PROM Present" />
                  
                  <div className="space-y-2">
                    <Label>PROM Duration (hours)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="240"
                      placeholder="Enter hours (0-240)"
                      onChange={(e) => updateFormData("prom_duration_hours", Number.parseFloat(e.target.value))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Maternal Fever (°C)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="Enter temperature"
                      onChange={(e) => updateFormData("maternal_fever_celsius", Number.parseFloat(e.target.value))}
                    />
                  </div>

                  <YesNoRadio field="chorioamnionitis" label="Chorioamnionitis" />
                  <YesNoRadio field="foul_smelling_liquor" label="Foul Smelling Liquor" />
                  <YesNoRadio field="prolonged_labor" label="Prolonged Labor" />

                  <div className="space-y-2">
                    <Label>PV Examinations Count</Label>
                    <Input
                      type="number"
                      min="0"
                      max="20"
                      placeholder="Enter count (0-20)"
                      onChange={(e) => updateFormData("pv_examinations_count", Number.parseFloat(e.target.value))}
                    />
                  </div>

                  <YesNoRadio field="unbooked_pregnancy" label="Unbooked Pregnancy" />
                  <YesNoRadio field="maternal_uti_sti" label="Maternal UTI/STI" />
                  <YesNoRadio field="meconium_stained_liquor" label="Meconium Stained Liquor" />
                  <YesNoRadio field="cotwin_iud" label="Co-twin IUD" />
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
                  <div className="space-y-2">
                    <Label>Gestational Age (weeks)</Label>
                    <Input
                      type="number"
                      min="22"
                      max="44"
                      step="0.1"
                      placeholder="Enter weeks (22-44)"
                      onChange={(e) => updateFormData("gestational_age_weeks", Number.parseFloat(e.target.value))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Birth Weight (grams)</Label>
                    <Input
                      type="number"
                      min="300"
                      max="6000"
                      placeholder="Enter grams (300-6000)"
                      onChange={(e) => updateFormData("birth_weight_grams", Number.parseFloat(e.target.value))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Gestational Age Category</Label>
                    <Select onValueChange={(value: string) => updateFormData("gestational_age_category", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="<34 weeks">&lt;34 weeks</SelectItem>
                        <SelectItem value="34–36 weeks">34–36 weeks</SelectItem>
                        <SelectItem value="≥37 weeks">≥37 weeks</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Birth Weight Category</Label>
                    <Select onValueChange={(value: string) => updateFormData("birth_weight_category", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="<1500 g">&lt;1500 g</SelectItem>
                        <SelectItem value="1500–2499 g">1500–2499 g</SelectItem>
                        <SelectItem value="≥2500 g">≥2500 g</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Apgar Score (1 min)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="10"
                      placeholder="Enter score (0-10)"
                      onChange={(e) => updateFormData("apgar_1_min", Number.parseFloat(e.target.value))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Apgar Score (5 min)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="10"
                      placeholder="Enter score (0-10)"
                      onChange={(e) => updateFormData("apgar_5_min", Number.parseFloat(e.target.value))}
                    />
                  </div>

                  <YesNoRadio field="resuscitation_required" label="Resuscitation Required" />

                  <div className="space-y-2">
                    <Label>Neonatal Sex</Label>
                    <Select onValueChange={(value: string) => updateFormData("neonatal_sex", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select sex" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                      </SelectContent>
                    </Select>
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
                      min="30"
                      max="42"
                      step="0.1"
                      placeholder="Enter temperature (30-42°C)"
                      onChange={(e) => updateFormData("temperature_celsius", Number.parseFloat(e.target.value))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Feeding Status</Label>
                    <Select onValueChange={(value: string) => updateFormData("feeding_status", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="poor">Poor</SelectItem>
                        <SelectItem value="absent">Absent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Activity Level</Label>
                    <Select onValueChange={(value: string) => updateFormData("activity_level", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="lethargic">Lethargic</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Respiratory Distress</Label>
                    <Select onValueChange={(value: string) => updateFormData("respiratory_distress", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select severity" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="mild">Mild</SelectItem>
                        <SelectItem value="severe">Severe</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Heart Rate (bpm)</Label>
                    <Input
                      type="number"
                      min="60"
                      max="240"
                      placeholder="Enter rate (60-240 bpm)"
                      onChange={(e) => updateFormData("heart_rate_bpm", Number.parseFloat(e.target.value))}
                    />
                  </div>

                  <YesNoRadio field="apnea_present" label="Apnea Present" />
                  <YesNoRadio field="shock_present" label="Shock Present" />
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
                      <YesNoRadio field="hss_tlc_abnormal" label="Abnormal Total Leukocyte Count ( < 5000 or > 25000 cells/mm³ )" />
                      <YesNoRadio field="hss_anc_abnormal" label="Abnormal Absolute Neutrophil Count" />
                      <YesNoRadio field="hss_it_ratio_high" label="Immature-to-Total Neutrophil Ratio > 0.2" />
                      <YesNoRadio field="hss_im_ratio_high" label="Immature-to-Mature Neutrophil Ratio > 0.3" />
                      <YesNoRadio field="hss_platelet_low" label="Platelet Count < 150,000/mm³" />
                      <YesNoRadio field="hss_neutrophil_degeneration" label="Degenerative Changes in Neutrophils" />
                      <YesNoRadio field="hss_nrbc_elevated" label="Elevated Nucleated Red Blood Cells (NRBCs)" />
                    </div>
                  </CardContent>
                </Card>

                {/* D2. APGAR Score */}
                <Card className="border-2">
                  <CardContent className="p-4 md:p-6">
                    <h3 className="text-base md:text-lg font-semibold mb-4">
                      D2. APGAR Score
                    </h3>
                    
                    {/* APGAR at 1 minute */}
                    <div className="mb-6 pb-6 border-b">
                      <h4 className="text-sm md:text-base font-semibold mb-4">APGAR at 1 minute</h4>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                        <div className="space-y-2">
                          <Label>Appearance (0–2)</Label>
                          <Select onValueChange={(value: string) => updateFormData("apgar1_appearance", value)}>
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
                          <Select onValueChange={(value: string) => updateFormData("apgar1_pulse", value)}>
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
                          <Select onValueChange={(value: string) => updateFormData("apgar1_grimace", value)}>
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
                          <Select onValueChange={(value: string) => updateFormData("apgar1_activity", value)}>
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
                          <Select onValueChange={(value: string) => updateFormData("apgar1_respiration", value)}>
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
                          <Select onValueChange={(value: string) => updateFormData("apgar5_appearance", value)}>
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
                          <Select onValueChange={(value: string) => updateFormData("apgar5_pulse", value)}>
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
                          <Select onValueChange={(value: string) => updateFormData("apgar5_grimace", value)}>
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
                          <Select onValueChange={(value: string) => updateFormData("apgar5_activity", value)}>
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
                          <Select onValueChange={(value: string) => updateFormData("apgar5_respiration", value)}>
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
