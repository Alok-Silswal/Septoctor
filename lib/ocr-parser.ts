import type { AssessmentData } from "@/app/page"

/* ----------------------------------
   TEXT NORMALIZATION
---------------------------------- */

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^\w\s.:()/<>–-]/g, "")
    .trim()
}

/* ----------------------------------
   GENERIC EXTRACTORS
---------------------------------- */

function extractYesNo(
  text: string,
  label: string
): "yes" | "no" | undefined {
  const regex = new RegExp(`${label}\\s*:\\s*(yes|no)`, "i")
  const match = text.match(regex)
  return match ? (match[1].toLowerCase() as "yes" | "no") : undefined
}

function extractNumber(
  text: string,
  label: string
): number | undefined {
  const regex = new RegExp(`${label}[^0-9]*(\\d+(?:\\.\\d+)?)`, "i")
  const match = text.match(regex)
  return match ? Number(match[1]) : undefined
}

function extractEnum<T extends string>(
  text: string,
  label: string,
  allowed: readonly T[]
): T | undefined {
  const regex = new RegExp(
    `${label}\\s*:\\s*(${allowed.join("|")})`,
    "i"
  )
  const match = text.match(regex)
  return match ? (match[1].toLowerCase() as T) : undefined
}

/* ----------------------------------
   MAIN PARSER
---------------------------------- */

export function parseOCRText(text: string): Partial<AssessmentData> {
  const t = normalize(text)
  const result: Partial<AssessmentData> = {}

  /* ----------------------------------
     SECTION A: ANTENATAL / PERIPARTUM
  ---------------------------------- */

  result.prom_present = extractYesNo(t, "prom present")
  result.chorioamnionitis = extractYesNo(t, "chorioamnionitis")
  result.foul_smelling_liquor = extractYesNo(t, "foul smelling liquor")
  result.prolonged_labor = extractYesNo(t, "prolonged labor")
  result.unbooked_pregnancy = extractYesNo(t, "unbooked pregnancy")
  result.maternal_uti_sti = extractYesNo(t, "maternal uti/sti")
  result.meconium_stained_liquor = extractYesNo(t, "meconium stained liquor")
  result.cotwin_iud = extractYesNo(t, "co-twin iud")

  result.prom_duration_hours = extractNumber(t, "prom duration")
  result.maternal_fever_celsius = extractNumber(t, "maternal fever")
  result.pv_examinations_count = extractNumber(t, "pv examinations")

  /* ----------------------------------
     SECTION B: NEONATAL FACTORS
  ---------------------------------- */

  result.birth_weight_grams = extractNumber(t, "birth weight")
  result.gestational_age_weeks = extractNumber(t, "gestational age")

  result.apgar_1_min = extractNumber(t, "apgar 1")
  result.apgar_5_min = extractNumber(t, "apgar 5")

  result.resuscitation_required = extractYesNo(
    t,
    "resuscitation required"
  )

  result.neonatal_sex = extractEnum(
    t,
    "neonatal sex",
    ["male", "female"] as const
  )

  /* ----------------------------------
     SECTION C: EARLY CLINICAL SIGNS
  ---------------------------------- */

  result.temperature_celsius = extractNumber(t, "temperature")
  result.heart_rate_bpm = extractNumber(t, "heart rate")

  result.apnea_present = extractYesNo(t, "apnea present")
  result.shock_present = extractYesNo(t, "shock present")

  result.feeding_status = extractEnum(
    t,
    "feeding status",
    ["normal", "poor", "absent"] as const
  )

  result.activity_level = extractEnum(
    t,
    "activity level",
    ["active", "lethargic"] as const
  )

  result.respiratory_distress = extractEnum(
    t,
    "respiratory distress",
    ["none", "mild", "severe"] as const
  )

  /* ----------------------------------
     AUTO-DERIVED CATEGORIES
  ---------------------------------- */

  if (result.gestational_age_weeks !== undefined) {
    const ga = result.gestational_age_weeks
    if (ga < 34) result.gestational_age_category = "<34 weeks"
    else if (ga <= 36) result.gestational_age_category = "34–36 weeks"
    else result.gestational_age_category = "≥37 weeks"
  }

  if (result.birth_weight_grams !== undefined) {
    const bw = result.birth_weight_grams
    if (bw < 1500) result.birth_weight_category = "<1500 g"
    else if (bw < 2500) result.birth_weight_category = "1500–2499 g"
    else result.birth_weight_category = "≥2500 g"
  }

  return result
}
