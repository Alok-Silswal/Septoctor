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
   APGAR COMPONENT EXTRACTORS
---------------------------------- */
function extractApgarComponent(
  text: string,
  timepoint: "1" | "5",
  component: string
): string | undefined {
  // Try multiple patterns
  const patterns = [
    // Pattern 1: "apgar 1 appearance: 1"
    new RegExp(`apgar\\s*${timepoint}\\s*${component}\\s*:\\s*([0-2])`, "i"),
    // Pattern 2: "appearance (apgar 1): 1"
    new RegExp(`${component}\\s*\\(apgar\\s*${timepoint}\\)\\s*:\\s*([0-2])`, "i"),
    // Pattern 3: "apgar at 1 minute - appearance: 1"
    new RegExp(`apgar\\s*(?:at)?\\s*${timepoint}\\s*(?:min|minute).*${component}\\s*:\\s*([0-2])`, "i"),
    // Pattern 4: Just component with context nearby
    new RegExp(`${timepoint}\\s*(?:min|minute).*${component}\\s*:\\s*([0-2])`, "i"),
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) return match[1]
  }

  return undefined
}

/* ----------------------------------
   STRUCTURED DATA DETECTION
---------------------------------- */
function isStructuredData(text: string): boolean {
  try {
    JSON.parse(text)
    return true
  } catch {
    return false
  }
}

function parseStructuredData(text: string): Partial<AssessmentData> {
  try {
    const data = JSON.parse(text)
    const result: Partial<AssessmentData> = {}

    // Direct mapping for structured data
    const directMappings: { [key: string]: keyof AssessmentData } = {
      prom_present: "prom_present",
      prom_duration_hours: "prom_duration_hours",
      maternal_fever_celsius: "maternal_fever_celsius",
      chorioamnionitis: "chorioamnionitis",
      foul_smelling_liquor: "foul_smelling_liquor",
      prolonged_labor: "prolonged_labor",
      pv_examinations_count: "pv_examinations_count",
      unbooked_pregnancy: "unbooked_pregnancy",
      maternal_uti_sti: "maternal_uti_sti",
      meconium_stained_liquor: "meconium_stained_liquor",
      cotwin_iud: "cotwin_iud",
      apgar_1_min: "apgar_1_min",
      apgar_5_min: "apgar_5_min",
      resuscitation_required: "resuscitation_required",
      neonatal_sex: "neonatal_sex",
      temperature_celsius: "temperature_celsius",
      feeding_status: "feeding_status",
      activity_level: "activity_level",
      respiratory_distress: "respiratory_distress",
      heart_rate_bpm: "heart_rate_bpm",
      apnea_present: "apnea_present",
      shock_present: "shock_present",
      hss_tlc_abnormal: "hss_tlc_abnormal",
      hss_anc_abnormal: "hss_anc_abnormal",
      hss_it_ratio_high: "hss_it_ratio_high",
      hss_im_ratio_high: "hss_im_ratio_high",
      hss_platelet_low: "hss_platelet_low",
      hss_neutrophil_degeneration: "hss_neutrophil_degeneration",
      hss_nrbc_elevated: "hss_nrbc_elevated",
      apgar1_appearance: "apgar1_appearance",
      apgar1_pulse: "apgar1_pulse",
      apgar1_grimace: "apgar1_grimace",
      apgar1_activity: "apgar1_activity",
      apgar1_respiration: "apgar1_respiration",
      apgar5_appearance: "apgar5_appearance",
      apgar5_pulse: "apgar5_pulse",
      apgar5_grimace: "apgar5_grimace",
      apgar5_activity: "apgar5_activity",
      apgar5_respiration: "apgar5_respiration",
    }

    // Map direct fields
    Object.keys(directMappings).forEach((key) => {
      if (data[key] !== undefined) {
        result[directMappings[key]] = data[key]
      }
    })

    // Handle birth weight conversion
    if (data.birth_weight_grams !== undefined) {
      const bw = Number(data.birth_weight_grams)
      if (bw < 1500) result.birth_weight_category = "<1500 g"
      else if (bw < 2500) result.birth_weight_category = "1500–2499 g"
      else result.birth_weight_category = "≥2500 g"
    }

    // Handle gestational age conversion
    if (data.gestational_age_weeks !== undefined) {
      const ga = Number(data.gestational_age_weeks)
      if (ga < 34) result.gestational_age_category = "<34 weeks"
      else if (ga <= 36) result.gestational_age_category = "34–36 weeks"
      else result.gestational_age_category = "≥37 weeks"
    }

    return result
  } catch {
    return {}
  }
}

/* ----------------------------------
   MAIN PARSER
---------------------------------- */
export function parseOCRText(text: string): Partial<AssessmentData> {
  // Check if it's structured data first
  if (isStructuredData(text)) {
    return parseStructuredData(text)
  }

  // Otherwise, parse as OCR text
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
  result.cotwin_iud = extractYesNo(t, "co-twin iud") || extractYesNo(t, "cotwin iud")

  result.prom_duration_hours = extractNumber(t, "prom duration")
  result.maternal_fever_celsius = extractNumber(t, "maternal fever")
  result.pv_examinations_count = extractNumber(t, "pv examinations")

  /* ----------------------------------
     SECTION B: NEONATAL FACTORS
  ---------------------------------- */
  // Birth Weight → CATEGORY
  const bw = extractNumber(t, "birth weight")
  if (bw !== undefined) {
    if (bw < 1500) result.birth_weight_category = "<1500 g"
    else if (bw < 2500) result.birth_weight_category = "1500–2499 g"
    else result.birth_weight_category = "≥2500 g"
  }

  // Gestational Age → CATEGORY
  const ga = extractNumber(t, "gestational age")
  if (ga !== undefined) {
    if (ga < 34) result.gestational_age_category = "<34 weeks"
    else if (ga <= 36) result.gestational_age_category = "34–36 weeks"
    else result.gestational_age_category = "≥37 weeks"
  }

  result.apgar_1_min = extractNumber(t, "apgar 1")
  result.apgar_5_min = extractNumber(t, "apgar 5")
  
  result.resuscitation_required = extractYesNo(t, "resuscitation required")
  result.neonatal_sex = extractEnum(t, "neonatal sex", ["male", "female"] as const)

  // APGAR Components - 1 minute
  result.apgar1_appearance = extractApgarComponent(t, "1", "appearance")
  result.apgar1_pulse = extractApgarComponent(t, "1", "pulse")
  result.apgar1_grimace = extractApgarComponent(t, "1", "grimace")
  result.apgar1_activity = extractApgarComponent(t, "1", "activity")
  result.apgar1_respiration = extractApgarComponent(t, "1", "respiration")

  // APGAR Components - 5 minutes
  result.apgar5_appearance = extractApgarComponent(t, "5", "appearance")
  result.apgar5_pulse = extractApgarComponent(t, "5", "pulse")
  result.apgar5_grimace = extractApgarComponent(t, "5", "grimace")
  result.apgar5_activity = extractApgarComponent(t, "5", "activity")
  result.apgar5_respiration = extractApgarComponent(t, "5", "respiration")

  /* ----------------------------------
     SECTION C: EARLY CLINICAL SIGNS
  ---------------------------------- */
  result.temperature_celsius = extractNumber(t, "temperature")
  result.heart_rate_bpm = extractNumber(t, "heart rate")
  result.apnea_present = extractYesNo(t, "apnea present")
  result.shock_present = extractYesNo(t, "shock present")

  result.feeding_status = extractEnum(t, "feeding status", ["normal", "poor", "absent"] as const)
  result.activity_level = extractEnum(t, "activity level", ["active", "lethargic"] as const)
  result.respiratory_distress = extractEnum(t, "respiratory distress", ["none", "mild", "severe"] as const)

  /* ----------------------------------
     SECTION D: HSS
  ---------------------------------- */
  result.hss_tlc_abnormal = extractYesNo(t, "tlc abnormal")
  result.hss_anc_abnormal = extractYesNo(t, "anc abnormal")
  result.hss_it_ratio_high = extractYesNo(t, "it ratio high")
  result.hss_im_ratio_high = extractYesNo(t, "im ratio high")
  result.hss_platelet_low = extractYesNo(t, "platelet count low") || extractYesNo(t, "platelet low")
  result.hss_neutrophil_degeneration = extractYesNo(t, "neutrophil degeneration")
  result.hss_nrbc_elevated = extractYesNo(t, "nrbc elevated")

  return result
}
