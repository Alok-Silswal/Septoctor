# backend/septoctor_ml/schemas.py

from pydantic import BaseModel
from typing import Optional


class InferenceRequest(BaseModel):
    # Maternal / perinatal
    prom_present: Optional[str]
    prom_duration_hours: Optional[float]
    maternal_fever_celsius: Optional[float]
    chorioamnionitis: Optional[str]
    foul_smelling_liquor: Optional[str]
    prolonged_labor: Optional[str]
    pv_examinations_count: Optional[int]
    unbooked_pregnancy: Optional[str]
    maternal_uti_sti: Optional[str]
    meconium_stained_liquor: Optional[str]
    cotwin_iud: Optional[str]

    # Neonatal demographics
    gestational_age_category: Optional[str]
    birth_weight_category: Optional[str]
    neonatal_sex: Optional[str]

    # Clinical
    temperature_celsius: Optional[float]
    feeding_status: Optional[str]
    activity_level: Optional[str]
    respiratory_distress: Optional[str]
    heart_rate_bpm: Optional[float]
    apnea_present: Optional[str]
    shock_present: Optional[str]

    # HSS flags
    hss_tlc_abnormal: Optional[str]
    hss_anc_abnormal: Optional[str]
    hss_it_ratio_high: Optional[str]
    hss_im_ratio_high: Optional[str]
    hss_platelet_low: Optional[str]
    hss_neutrophil_degeneration: Optional[str]
    hss_nrbc_elevated: Optional[str]

    # APGAR components
    apgar1_appearance: Optional[str]
    apgar1_pulse: Optional[str]
    apgar1_grimace: Optional[str]
    apgar1_activity: Optional[str]
    apgar1_respiration: Optional[str]

    apgar5_appearance: Optional[str]
    apgar5_pulse: Optional[str]
    apgar5_grimace: Optional[str]
    apgar5_activity: Optional[str]
    apgar5_respiration: Optional[str]

    resuscitation_required: Optional[str]
