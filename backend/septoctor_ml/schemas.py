# backend/septoctor_ml/schemas.py

from pydantic import BaseModel
from typing import Optional, Union


class InferenceRequest(BaseModel):
    # Maternal / perinatal
    prom_present: Optional[Union[str, int]]
    prom_duration_hours: Optional[float]
    maternal_fever_celsius: Optional[float]
    chorioamnionitis: Optional[Union[str, int]]
    foul_smelling_liquor: Optional[Union[str, int]]
    prolonged_labor: Optional[Union[str, int]]
    pv_examinations_count: Optional[int]
    unbooked_pregnancy: Optional[Union[str, int]]
    maternal_uti_sti: Optional[Union[str, int]]
    meconium_stained_liquor: Optional[Union[str, int]]
    cotwin_iud: Optional[Union[str, int]]

    # Neonatal demographics
    gestational_age_category: Optional[Union[str, int]] = None
    gestational_age_weeks: Optional[float] = None
    birth_weight_category: Optional[Union[str, int]] = None
    birth_weight_grams: Optional[float] = None
    neonatal_sex: Optional[Union[str, int]] = None

    # Clinical
    temperature_celsius: Optional[float]
    feeding_status: Optional[Union[str, int]]
    activity_level: Optional[Union[str, int]]
    respiratory_distress: Optional[Union[str, int]]
    heart_rate_bpm: Optional[float]
    apnea_present: Optional[Union[str, int]]
    shock_present: Optional[Union[str, int]]

    # HSS flags
    hss_tlc_abnormal: Optional[Union[str, int]]
    hss_anc_abnormal: Optional[Union[str, int]]
    hss_it_ratio_high: Optional[Union[str, int]]
    hss_im_ratio_high: Optional[Union[str, int]]
    hss_platelet_low: Optional[Union[str, int]]
    hss_neutrophil_degeneration: Optional[Union[str, int]]
    hss_nrbc_elevated: Optional[Union[str, int]]

    # APGAR components
    apgar1_appearance: Optional[Union[str, int]]
    apgar1_pulse: Optional[Union[str, int]]
    apgar1_grimace: Optional[Union[str, int]]
    apgar1_activity: Optional[Union[str, int]]
    apgar1_respiration: Optional[Union[str, int]]

    apgar5_appearance: Optional[Union[str, int]]
    apgar5_pulse: Optional[Union[str, int]]
    apgar5_grimace: Optional[Union[str, int]]
    apgar5_activity: Optional[Union[str, int]]
    apgar5_respiration: Optional[Union[str, int]]

    resuscitation_required: Optional[Union[str, int]]

