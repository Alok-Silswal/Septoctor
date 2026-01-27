import type { AssessmentData } from "@/app/page";
import { AlertTriangle, Activity, Heart } from "lucide-react";

/* =====================================
   MNRS — Maternal Neonatal Risk Score
===================================== */

export function calculateMNRS(d: Partial<AssessmentData>) {
  let s = 0;

  /* ---- A. Antenatal / Peripartum ---- */

  if (d.prom_present === "yes" && (d.prom_duration_hours ?? 0) >= 18) s += 3;
  if (d.chorioamnionitis === "yes") s += 3;
  if ((d.maternal_fever_celsius ?? 0) >= 38) s += 3;

  if (d.foul_smelling_liquor === "yes") s += 2;
  if ((d.pv_examinations_count ?? 0) >= 3) s += 2;
  if (d.meconium_stained_liquor === "yes") s += 2;
  if (d.prolonged_labor === "yes") s += 2;

  if (d.unbooked_pregnancy === "yes") s += 1;
  if (d.maternal_uti_sti === "yes") s += 1;
  if (d.cotwin_iud === "yes") s += 1;

  /* ---- B. Neonatal baseline ---- */

  if (d.gestational_age_category === "<34 weeks") s += 3;
  else if (d.gestational_age_category === "34–36 weeks") s += 2;

  if (d.birth_weight_category === "<1500 g") s += 3;
  else if (d.birth_weight_category === "1500–2499 g") s += 2;

  if ((d.apgar_5_min ?? 10) < 7) s += 3;
  else if ((d.apgar_1_min ?? 10) < 7) s += 2;

  if (d.resuscitation_required === "yes") s += 3;
  if (d.neonatal_sex === "male") s += 1;

  /* ---- C. Early clinical (0–72h) ---- */

  if ((d.temperature_celsius ?? 37) < 36 || (d.temperature_celsius ?? 37) > 38) s += 3;

  if (d.feeding_status === "poor" || d.activity_level === "lethargic") s += 3;

  if (d.apnea_present === "yes" || d.shock_present === "yes") s += 3;

  if ((d.heart_rate_bpm ?? 120) > 160) s += 2;

  if (d.respiratory_distress === "mild" || d.respiratory_distress === "severe") s += 2;

  return s;
}

export function getMNRSCategory(score: number) {
  if (score <= 5) return { risk: "Low", action: "Observe", icon: AlertTriangle };
  if (score <= 10) return { risk: "Moderate", action: "Do Sepsis Screen", icon: AlertTriangle };
  if (score <= 15) return { risk: "High", action: "Start Antibiotics", icon: AlertTriangle };
  return { risk: "Very High", action: "Treat as Sepsis", icon: AlertTriangle };
}

/* =====================================
   HSS — Hematologic Scoring System
   Each YES = 1 point
===================================== */

export function calculateHSS(d: Partial<AssessmentData>) {
  const fields = [
    d.hss_tlc_abnormal,
    d.hss_anc_abnormal,
    d.hss_it_ratio_high,
    d.hss_im_ratio_high,
    d.hss_platelet_low,
    d.hss_neutrophil_degeneration,
    d.hss_nrbc_elevated,
  ];

  return fields.reduce((sum, v) => sum + (v === "yes" ? 1 : 0), 0);
}

export function getHSSCategory(score: number) {
  if (score >= 5) return { risk: "High", action: "Review hematologic abnormalities", icon: Activity };
  if (score >= 3) return { risk: "Moderate", action: "Monitor closely", icon: Activity };
  return { risk: "Low", action: "Continue observation", icon: Activity };
}

/* =====================================
   APGAR
   Values are strings "0" | "1" | "2"
===================================== */

function n(v: any) {
  return Number(v) || 0;
}

export function calculateApgar1(d: Partial<AssessmentData>) {
  return (
    n(d.apgar1_appearance) +
    n(d.apgar1_pulse) +
    n(d.apgar1_grimace) +
    n(d.apgar1_activity) +
    n(d.apgar1_respiration)
  );
}

export function calculateApgar5(d: Partial<AssessmentData>) {
  return (
    n(d.apgar5_appearance) +
    n(d.apgar5_pulse) +
    n(d.apgar5_grimace) +
    n(d.apgar5_activity) +
    n(d.apgar5_respiration)
  );
}

export function getApgar1Category(score: number) {
  if (score < 3) return { risk: "High", action: "Immediate intervention required", icon: Heart };
  if (score < 7) return { risk: "Moderate", action: "Monitor and support", icon: Heart };
  return { risk: "Low", action: "Routine care", icon: Heart };
}

export function getApgar5Category(score: number) {
  if (score < 3) return { risk: "High", action: "Intensive care monitoring", icon: Heart };
  if (score < 7) return { risk: "Moderate", action: "Close observation", icon: Heart };
  return { risk: "Low", action: "Standard monitoring", icon: Heart };
}
