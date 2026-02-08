import type { AssessmentData } from "@/app/page"

// ---- Response types ----
export type RiskBucket = "Low" | "Moderate" | "High"

export interface ShapFactor {
  feature: string
  display_name: string
  impact: number
}

export interface PredictResponse {
  sepsis_probability: number
  sepsis_label: number          // 0 = No, 1 = Yes
  risk_bucket: RiskBucket
  confidence: number
  shap_top5: ShapFactor[]
  shap_all_features: ShapFactor[]
  shap_expected_value: number   // baseline (expected) probability
}

// ---- Normalise raw backend JSON into a stable PredictResponse ----
function normalise(raw: any): PredictResponse {
  // Handle old backend that returns { shap: [...] } instead of shap_top5 / shap_all_features
  const oldShap: any[] = raw.shap ?? []

  const toShapFactor = (s: any): ShapFactor => ({
    feature: s.feature ?? "",
    display_name: s.display_name ?? s.feature?.replace(/_/g, " ") ?? "",
    impact: s.impact ?? s.shap_value ?? 0,
  })

  const shap_top5: ShapFactor[] = (raw.shap_top5 ?? oldShap).map(toShapFactor)
  const shap_all_features: ShapFactor[] = (raw.shap_all_features ?? oldShap).map(toShapFactor)
  const shap_expected_value: number = raw.shap_expected_value ?? 0

  return {
    sepsis_probability: raw.sepsis_probability ?? 0,
    sepsis_label: raw.sepsis_label ?? 0,
    risk_bucket: raw.risk_bucket ?? "Low",
    confidence: raw.confidence ?? 0,
    shap_top5,
    shap_all_features,
    shap_expected_value,
  }
}

// ---- API call ----
export async function predictSepsis(
  payload: AssessmentData
): Promise<PredictResponse> {
  const response = await fetch("/api/predict", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`ML API error (${response.status}): ${text}`)
  }

  const raw = await response.json()
  console.log("[ML API] raw response:", JSON.stringify(raw).slice(0, 500))
  return normalise(raw)
}
