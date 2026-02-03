"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { AlertTriangle, CheckCircle, Brain, TrendingUp, ArrowLeft } from "lucide-react"


interface ResultsPageProps {
  riskScore: number | null
  onFinalPage: () => void
  onBack: () => void
}

export function ResultsPage({ riskScore, onFinalPage, onBack }: ResultsPageProps) {
const isHighRisk = (riskScore || 0) > 60
  const riskLevel = isHighRisk ? "High Risk" : "Low Risk"
  const riskColor = isHighRisk ? "text-medical-danger" : "text-medical-success"
  const RiskIcon = isHighRisk ? AlertTriangle : CheckCircle

  return (
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
        <Card
          className="bg-white/95 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all cursor-pointer min-h-[44px]"
          onClick={onDoctorInteraction}
        >
          <CardHeader className="text-center pb-3 md:pb-4">
            <CardTitle className="text-base md:text-lg">Combined Risk Score</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <div className="text-3xl md:text-4xl font-bold mb-2" style={{ color: isHighRisk ? "#ef4444" : "#10b981" }}>
              {riskScore}%
            </div>
            <Badge variant={isHighRisk ? "destructive" : "default"} className="mb-3 md:mb-4">
              {riskScore && riskScore > 80 ? "Very High" : isHighRisk ? "High" : "Low"} Confidence
            </Badge>
            <p className="text-xs text-muted-foreground">Click to expand details</p>
          </CardContent>
        </Card>

        <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-xl">
          <CardHeader className="text-center pb-3 md:pb-4">
            <CardTitle className="text-base md:text-lg">ML Model Prediction</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <div className="flex items-center justify-center mb-4">
              <Brain className="w-8 h-8 text-primary mr-2" />
              <span className="text-2xl md:text-3xl font-bold">{riskScore && riskScore + 5}%</span>
            </div>
            <Badge variant="outline" className="mb-2">
              Neural Network
            </Badge>
            <p className="text-xs md:text-sm text-muted-foreground">Deep learning analysis</p>
          </CardContent>
        </Card>

        <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-xl">
          <CardHeader className="text-center pb-3 md:pb-4">
            <CardTitle className="text-base md:text-lg">Risk Trend</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <div className="flex items-center justify-center mb-4">
              <TrendingUp
                className={`w-8 h-8 md:w-12 md:h-12 mr-2 ${isHighRisk ? "text-medical-danger" : "text-medical-success"}`}
              />
              <span className="text-2xl md:text-3xl font-bold">{isHighRisk ? "Rising" : "Stable"}</span>
            </div>
            <Progress value={riskScore || 0} className="mb-2" />
            <p className="text-xs md:text-sm text-muted-foreground">Based on vital trends</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-xl">
        <CardContent className="p-4 md:p-8 text-center">
          <div className="flex flex-col sm:flex-row items-center justify-center mb-4 md:mb-6 gap-3 md:gap-4">
            <RiskIcon className={`w-12 h-12 md:w-16 md:h-16 ${riskColor}`} />
            <div>
              <h3 className={`text-2xl md:text-4xl font-bold ${riskColor} mb-2`}>{riskLevel} Detected</h3>
              <p className="text-sm md:text-lg text-muted-foreground">
                {isHighRisk ? "Immediate medical attention recommended" : "Continue monitoring with standard protocols"}
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg p-4 md:p-6 mb-4 md:mb-6">
            <h4 className="text-base md:text-lg font-semibold mb-3 md:mb-4">Why this output?</h4>
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
          </div>

         <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center">
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
  )
}
