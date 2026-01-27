"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft,
  Brain,
} from "lucide-react"

import type { AssessmentData } from "@/app/page"
import {
  getMNRSCategory,
  getHSSCategory,
  getApgar1Category,
  getApgar5Category,
} from "@/lib/scoring"

interface DoctorInteractionPageProps {
  onBack: () => void
  data: Partial<AssessmentData>
}

export function DoctorInteractionPage({ onBack, data }: DoctorInteractionPageProps) {
  /* =========================
     REAL SCORES
  ========================= */

  const mnrsScore = data.mnrs_score ?? 0
  const hssScore = data.hss_score ?? 0
  const apgar1 = data.apgar1_total ?? 0
  const apgar5 = data.apgar5_total ?? 0

  const mnrsData = getMNRSCategory(mnrsScore)
  const hssData = getHSSCategory(hssScore)
  const apgar1Data = getApgar1Category(apgar1)
  const apgar5Data = getApgar5Category(apgar5)

  /* =========================
     SCORE CARDS
  ========================= */

  const scoringSystems = [
    {
      name: "Maternal–Neonatal Risk Score (MNRS)",
      score: mnrsScore,
      risk: mnrsData.risk,
      action: mnrsData.action,
      icon: mnrsData.icon,
      details: "Composite maternal, neonatal and early clinical risk factors",
    },
    {
      name: "Hematologic Scoring System (HSS)",
      score: hssScore,
      risk: hssData.risk,
      action: hssData.action,
      icon: hssData.icon,
      details: "Based on hematologic abnormalities suggesting infection",
    },
    {
      name: "APGAR Score (1 min)",
      score: apgar1,
      risk: apgar1Data.risk,
      action: apgar1Data.action,
      icon: apgar1Data.icon,
      details: "Immediate neonatal adaptation after birth",
    },
    {
      name: "APGAR Score (5 min)",
      score: apgar5,
      risk: apgar5Data.risk,
      action: apgar5Data.action,
      icon: apgar5Data.icon,
      details: "Ongoing neonatal stability and prognosis indicator",
    },
  ]

  /* ========================= */

  const getRiskColor = (risk: string) => {
    if (risk.includes("High")) return "text-medical-danger"
    if (risk.includes("Moderate")) return "text-medical-warning"
    if (risk.includes("Low")) return "text-medical-success"
    return "text-muted-foreground"
  }

  const getRiskBadgeVariant = (risk: string) => {
    if (risk.includes("High")) return "destructive"
    if (risk.includes("Moderate")) return "secondary"
    if (risk.includes("Low")) return "default"
    return "outline"
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* ================= HEADER ================= */}

      <div className="flex items-center mb-8">
        <Button variant="ghost" onClick={onBack} className="text-white hover:text-white/80 mr-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Results
        </Button>
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Detailed Scoring Analysis</h2>
          <p className="text-white/80">Rule-based clinical scoring breakdown</p>
        </div>
      </div>

      {/* ================= SCORE CARDS ================= */}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        {scoringSystems.map((system, index) => {
          const IconComponent = system.icon

          return (
            <Card
              key={index}
              className="bg-white/95 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all"
            >
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center mr-3">
                      <IconComponent className="w-5 h-5 text-white" />
                    </div>
                    <CardTitle className="text-base">{system.name}</CardTitle>
                  </div>

                  <Badge variant={getRiskBadgeVariant(system.risk)}>
                    {system.risk}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent>
                <div className="text-center mb-4">
                  <div className={`text-3xl font-bold mb-2 ${getRiskColor(system.risk)}`}>
                    {system.score}
                  </div>

                  <div className="w-full bg-muted rounded-full h-2 mb-4">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${
                        system.risk.includes("High")
                          ? "bg-medical-danger"
                          : system.risk.includes("Moderate")
                          ? "bg-medical-warning"
                          : "bg-medical-success"
                      }`}
                      style={{
                        width: `${Math.min(system.score * 10, 100)}%`,
                      }}
                    />
                  </div>
                </div>

                <p className="text-sm text-muted-foreground text-center">
                  {system.details}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* ================= CHATBOT MOCK ================= */}

      <Card className="mt-8 bg-white/95 backdrop-blur-sm border-0 shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Brain className="w-5 h-5 mr-2 text-primary" />
            Ask Septoctor
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div className="bg-gradient-to-r from-primary/5 to-accent/5 rounded-lg p-6">
            <div className="space-y-4">
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <p className="text-sm font-medium text-muted-foreground mb-2">Doctor:</p>
                <p className="text-sm">Why is the MNRS high for this patient?</p>
              </div>

              <div className="bg-gradient-to-r from-primary to-accent rounded-lg p-4 text-white">
                <p className="text-sm font-medium mb-2">Septoctor AI:</p>
                <p className="text-sm">
                  Elevated MNRS is driven by maternal infection indicators,
                  neonatal vulnerability, and early clinical instability.
                  These combined factors significantly increase sepsis risk.
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="outline" size="sm">Why high risk?</Button>
              <Button variant="outline" size="sm">Treatment?</Button>
              <Button variant="outline" size="sm">Monitoring?</Button>
              <Button variant="outline" size="sm">Prognosis?</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
