// /lib/chatbot/rules.ts
import type { AssessmentData } from "@/app/page";

export function getMissingCriticalFields(
  d: Partial<AssessmentData>
): string[] {
  const missing: string[] = [];

  if (d.temperature_celsius == null) missing.push("temperature_celsius");
  if (d.heart_rate_bpm == null) missing.push("heart_rate_bpm");
  if (d.feeding_status == null) missing.push("feeding_status");
  if (d.activity_level == null) missing.push("activity_level");

  return missing;
}

export function getAbnormalFields(
  d: Partial<AssessmentData>
): string[] {
  const abnormal: string[] = [];

  // Temperature
  if (
    d.temperature_celsius != null &&
    (d.temperature_celsius < 36 || d.temperature_celsius > 38)
  ) {
    abnormal.push("temperature_celsius");
  }

  // Heart rate
  if (d.heart_rate_bpm != null && d.heart_rate_bpm > 160) {
    abnormal.push("heart_rate_bpm");
  }

  // Feeding / activity
  if (d.feeding_status === "poor" || d.feeding_status === "absent") {
    abnormal.push("feeding_status");
  }

  if (d.activity_level === "lethargic") {
    abnormal.push("activity_level");
  }

  // Danger signs
  if (d.apnea_present === "yes") abnormal.push("apnea_present");
  if (d.shock_present === "yes") abnormal.push("shock_present");

  return abnormal;
}
