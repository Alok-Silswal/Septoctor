// /lib/chatbot/context.ts
import type { AssessmentData } from "@/app/page";

import {
  calculateMNRS,
  calculateHSS,
  calculateApgar1,
  calculateApgar5,
  getMNRSCategory,
  getHSSCategory,
  getApgar1Category,
  getApgar5Category,
} from "@/lib/scoring";

import {
  getMissingCriticalFields,
  getAbnormalFields,
} from "./rules";

export function buildChatbotContext(
  d: Partial<AssessmentData>,
  ocrMeta?: { confidence?: number }
) {
  // Scores (computed, not guessed)
  const mnrs = calculateMNRS(d);
  const hss = calculateHSS(d);
  const apgar1 = calculateApgar1(d);
  const apgar5 = calculateApgar5(d);

  return {
    antenatal_peripartum: {
      prom_present: d.prom_present,
      prom_duration_hours: d.prom_duration_hours,
      maternal_fever_celsius: d.maternal_fever_celsius,
      chorioamnionitis: d.chorioamnionitis,
      foul_smelling_liquor: d.foul_smelling_liquor,
      prolonged_labor: d.prolonged_labor,
      pv_examinations_count: d.pv_examinations_count,
      unbooked_pregnancy: d.unbooked_pregnancy,
      maternal_uti_sti: d.maternal_uti_sti,
      meconium_stained_liquor: d.meconium_stained_liquor,
      cotwin_iud: d.cotwin_iud,
    },

    neonatal_baseline: {
      gestational_age_category: d.gestational_age_category,
      birth_weight_category: d.birth_weight_category,
      neonatal_sex: d.neonatal_sex,
      apgar_1_min: d.apgar_1_min,
      apgar_5_min: d.apgar_5_min,
      resuscitation_required: d.resuscitation_required,
    },

    early_clinical_signs: {
      temperature_celsius: d.temperature_celsius,
      heart_rate_bpm: d.heart_rate_bpm,
      feeding_status: d.feeding_status,
      activity_level: d.activity_level,
      respiratory_distress: d.respiratory_distress,
      apnea_present: d.apnea_present,
      shock_present: d.shock_present,
    },

    hematologic: {
      hss_tlc_abnormal: d.hss_tlc_abnormal,
      hss_anc_abnormal: d.hss_anc_abnormal,
      hss_it_ratio_high: d.hss_it_ratio_high,
      hss_im_ratio_high: d.hss_im_ratio_high,
      hss_platelet_low: d.hss_platelet_low,
      hss_neutrophil_degeneration: d.hss_neutrophil_degeneration,
      hss_nrbc_elevated: d.hss_nrbc_elevated,
    },

    scores: {
      mnrs: {
        score: mnrs,
        ...getMNRSCategory(mnrs),
      },
      hss: {
        score: hss,
        ...getHSSCategory(hss),
      },
      apgar1: {
        score: apgar1,
        ...getApgar1Category(apgar1),
      },
      apgar5: {
        score: apgar5,
        ...getApgar5Category(apgar5),
      },
    },

    flags: {
      missing_fields: getMissingCriticalFields(d),
      abnormal_fields: getAbnormalFields(d),
      ocr_confidence: ocrMeta?.confidence,
    },
  };
}
