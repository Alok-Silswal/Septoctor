"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, CheckCircle, Brain, MessageCircle, ArrowLeft, X, TrendingUp, TrendingDown, Activity, ShieldCheck, ShieldAlert, Minus } from "lucide-react"
import { AIChatAssistant } from "@/components/ai-chat-assistant"
import type { AssessmentData } from "@/app/page"
import type { PredictResponse, ShapFactor } from "@/lib/ml-api"

interface ResultsPageProps {
  riskScore: number | null
  mlPrediction?: PredictResponse | null
  onDoctorInteraction: () => void
  onFinalPage: () => void
  onBack: () => void
  assessmentData?: Partial<AssessmentData>
}

export function ResultsPage({ riskScore, mlPrediction, onDoctorInteraction, onFinalPage, onBack, assessmentData }: ResultsPageProps) {
  const [chatOpen, setChatOpen] = useState(false)

  // Derive display values from ML prediction when available
  const probability = mlPrediction ? mlPrediction.sepsis_probability : (riskScore ?? 0) / 100
  const probabilityPct = Math.round(probability * 100)
  const sepsisLabel = mlPrediction ? (mlPrediction.sepsis_label === 1 ? "Yes" : "No") : (probabilityPct > 50 ? "Yes" : "No")
  const confidence = mlPrediction ? mlPrediction.confidence : 0
  const confidencePct = Math.round(confidence * 100)
  const riskBucket = mlPrediction?.risk_bucket ?? ((riskScore ?? 0) > 60 ? "High" : "Low")
  const isHighRisk = riskBucket === "High"
  const isMod = riskBucket === "Moderate"
  const top5 = mlPrediction?.shap_top5 ?? []

  // Colors per category
  const categoryColor = isHighRisk
    ? "text-red-600"
    : isMod
    ? "text-amber-500"
    : "text-emerald-600"
  const categoryBg = isHighRisk
    ? "bg-red-50 border-red-200"
    : isMod
    ? "bg-amber-50 border-amber-200"
    : "bg-emerald-50 border-emerald-200"
  const CategoryIcon = isHighRisk ? ShieldAlert : isMod ? Activity : ShieldCheck

  return (
    <>
      <div className="max-w-6xl mx-auto space-y-4 md:space-y-6 px-4">
        <div className="mb-4 md:mb-6">
          <Button
            variant="ghost"
            onClick={onBack}
            className="text-white hover:text-white hover:bg-white/10 flex items-center gap-2 min-h-[44px]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Assessment</span>
            <span className="sm:hidden">Back</span>
          </Button>
        </div>

        <div className="text-center mb-6 md:mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">Assessment Results</h2>
          <p className="text-sm md:text-base text-white/80">AI-powered sepsis risk analysis complete</p>
        </div>

        {/* ============ ML PREDICTION TILE ============ */}
        <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-xl overflow-hidden">
          <CardHeader className="pb-2 text-center bg-gradient-to-r from-primary/5 to-accent/5">
            <CardTitle className="flex items-center justify-center gap-2 text-lg md:text-xl">
              <Brain className="w-6 h-6 text-primary" />
              ML Model Prediction
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 pb-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {/* Risk Detected (leftmost) */}
              <div
                className={`flex flex-col items-center justify-center p-4 rounded-xl border cursor-pointer transition-shadow hover:shadow-lg ${categoryBg}`}
                onClick={onDoctorInteraction}
              >
                {isHighRisk ? (
                  <AlertTriangle className="w-8 h-8 md:w-10 md:h-10 text-red-500 mb-1.5" />
                ) : isMod ? (
                  <Activity className="w-8 h-8 md:w-10 md:h-10 text-amber-500 mb-1.5" />
                ) : (
                  <CheckCircle className="w-8 h-8 md:w-10 md:h-10 text-emerald-500 mb-1.5" />
                )}
                <span className={`text-sm md:text-base font-bold leading-tight text-center ${categoryColor}`}>
                  {riskBucket} Risk
                </span>
                <span className="text-[10px] text-muted-foreground mt-1">Detected</span>
              </div>

              {/* Sepsis Label (left-center) */}
              <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-gradient-to-b from-slate-50 to-white border border-slate-100">
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-2">Sepsis</span>
                <Badge
                  variant={sepsisLabel === "Yes" ? "destructive" : "default"}
                  className={`text-lg px-5 py-1.5 ${sepsisLabel === "No" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}`}
                >
                  {sepsisLabel}
                </Badge>
              </div>

              {/* Sepsis Probability + Confidence (right-center) */}
              <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-gradient-to-b from-slate-50 to-white border border-slate-100">
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-1">Probability</span>
                <span className={`text-3xl md:text-4xl font-extrabold tabular-nums leading-none ${categoryColor}`}>
                  {probabilityPct}%
                </span>
                <div className="mt-2 flex items-center gap-1.5 bg-slate-100 rounded-full px-3 py-0.5">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Conf</span>
                  <span className="text-sm font-bold tabular-nums text-slate-700">{confidencePct}%</span>
                </div>
              </div>


            </div>
          </CardContent>
        </Card>

        {/* ============ WHY THIS OUTPUT — TOP-5 SHAP ============ */}
        <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-xl">
          <CardContent className="p-4 md:p-8">
            <h4 className="text-base md:text-lg font-semibold mb-4 text-center">Why this output?</h4>
            <p className="text-xs text-center text-muted-foreground mb-5">
              Top 5 contributing factors from the ML model (SHAP analysis)
            </p>

            {top5.length > 0 ? (
              <div className="space-y-3 max-w-lg mx-auto">
                {top5.map((f, idx) => {
                  const isPositive = f.impact > 0
                  const absImpact = Math.abs(f.impact)
                  // Max bar width relative to largest impact
                  const maxImpact = Math.max(...top5.map(d => Math.abs(d.impact)), 0.01)
                  const barWidthPct = Math.max((absImpact / maxImpact) * 100, 4)
                  return (
                    <div key={f.feature} className="flex items-center gap-3">
                      <span className="text-xs font-medium text-muted-foreground w-4 text-right">{idx + 1}.</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium truncate">{f.display_name}</span>
                          <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                            {isPositive ? (
                              <TrendingUp className="w-3.5 h-3.5 text-red-500" />
                            ) : (
                              <TrendingDown className="w-3.5 h-3.5 text-emerald-500" />
                            )}
                            <span className={`text-xs font-semibold tabular-nums ${isPositive ? "text-red-600" : "text-emerald-600"}`}>
                              {isPositive ? "+" : ""}{f.impact.toFixed(3)}
                            </span>
                          </div>
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${isPositive ? "bg-red-400" : "bg-emerald-400"}`}
                            style={{ width: `${barWidthPct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
                <p className="text-[11px] text-center text-muted-foreground mt-3">
                  <span className="text-red-500">Red ↑</span> = pushes towards sepsis&nbsp;&nbsp;|&nbsp;&nbsp;<span className="text-emerald-500">Green ↓</span> = pushes away from sepsis
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 text-xs md:text-sm">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-primary rounded-full mr-2"></div>
                  <span>Vital signs analysis</span>
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-accent rounded-full mr-2"></div>
                  <span>Laboratory values</span>
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-medical-teal rounded-full mr-2"></div>
                  <span>Clinical presentation</span>
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-primary rounded-full mr-2"></div>
                  <span>Risk factor correlation</span>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center mt-6">
              <Button
                onClick={() => setChatOpen(true)}
                variant="outline"
                className="flex items-center bg-transparent min-h-[44px] w-full sm:w-auto"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Ask Septoctor
              </Button>
              <Button
                onClick={onFinalPage}
                className="bg-gradient-to-r from-primary to-accent min-h-[44px] w-full sm:w-auto"
              >
                View Full Report
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ============ CHAT SIDE PANEL ============ */}

      {/* Backdrop overlay */}
      {chatOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity"
          onClick={() => setChatOpen(false)}
        />
      )}

      {/* Slide-in panel */}
      <div
        className={`fixed top-0 right-0 h-full z-50 w-full sm:w-[420px] md:w-[460px] transition-transform duration-300 ease-in-out ${
          chatOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="h-full flex flex-col bg-white dark:bg-gray-900 shadow-2xl">
          {/* Panel header with close button */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-primary to-accent">
            <div className="flex items-center gap-2 text-white">
              <MessageCircle className="w-5 h-5" />
              <span className="font-semibold text-lg">Ask Septoctor</span>
            </div>
            <button
              onClick={() => setChatOpen(false)}
              className="text-white/80 hover:text-white hover:bg-white/20 rounded-full p-1.5 transition-colors"
              aria-label="Close chat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Chat component fills the rest */}
          <div className="flex-1 min-h-0">
            <AIChatAssistant
              patientContext={{
                riskScore,
                mlPrediction: mlPrediction
                  ? {
                      sepsis_probability: mlPrediction.sepsis_probability,
                      sepsis_label: mlPrediction.sepsis_label,
                      risk_bucket: mlPrediction.risk_bucket,
                      confidence: mlPrediction.confidence,
                    }
                  : undefined,
                shapAllFeatures: mlPrediction?.shap_all_features ?? [],
                shapExpectedValue: mlPrediction?.shap_expected_value ?? null,
                ...assessmentData,
              }}
              className="h-full rounded-none border-0 shadow-none"
            />
          </div>
        </div>
      </div>
    </>
  )
}
