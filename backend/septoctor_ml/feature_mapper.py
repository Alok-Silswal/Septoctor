"""
Maps UI-level semantic inputs (strings / numbers)
to model-level numeric + one-hot encoded features.

This MUST exactly match the feature space used during training.
"""

from typing import Dict, Any


def map_ui_to_model(raw: Dict[str, Any]) -> Dict[str, int | float]:
    mapped: Dict[str, int | float] = {}

    # =====================================================
    # Continuous / numeric features
    # =====================================================

    mapped["prom_duration_hours"] = float(raw.get("prom_duration_hours") or 0)
    mapped["maternal_fever_celsius"] = float(raw.get("maternal_fever_celsius") or 0)
    mapped["temperature_celsius"] = float(raw.get("temperature_celsius") or 0)
    mapped["heart_rate_bpm"] = float(raw.get("heart_rate_bpm") or 0)
    mapped["pv_examinations_count"] = int(raw.get("pv_examinations_count") or 0)

    # If these existed during training (seen in error trace)
    mapped["gestational_age_weeks"] = float(raw.get("gestational_age_weeks") or 0)
    mapped["birth_weight_grams"] = float(raw.get("birth_weight_grams") or 0)

    # =====================================================
    # Helper lambdas
    # =====================================================

    yes = lambda v: 1 if v in ["yes", 1, True] else 0

    # =====================================================
    # Binary YES/NO → *_yes
    # =====================================================

    yes_no_fields = [
        "prom_present",
        "chorioamnionitis",
        "foul_smelling_liquor",
        "prolonged_labor",
        "unbooked_pregnancy",
        "maternal_uti_sti",
        "meconium_stained_liquor",
        "cotwin_iud",
        "apnea_present",
        "shock_present",
        "hss_tlc_abnormal",
        "hss_anc_abnormal",
        "hss_it_ratio_high",
        "hss_im_ratio_high",
        "hss_platelet_low",
        "hss_neutrophil_degeneration",
        "hss_nrbc_elevated",
        "resuscitation_required",
    ]

    for field in yes_no_fields:
        mapped[f"{field}_yes"] = yes(raw.get(field))

    # =====================================================
    # Feeding status (one-hot)
    # =====================================================

    feeding = raw.get("feeding_status")
    mapped["feeding_status_normal"] = 1 if feeding == "normal" else 0
    mapped["feeding_status_poor"] = 1 if feeding == "poor" else 0

    # =====================================================
    # Activity level
    # =====================================================

    activity = raw.get("activity_level")
    mapped["activity_level_lethargic"] = 1 if activity == "lethargic" else 0

    # =====================================================
    # Respiratory distress
    # =====================================================

    resp = raw.get("respiratory_distress")
    mapped["respiratory_distress_none"] = 1 if resp == "none" else 0
    mapped["respiratory_distress_severe"] = 1 if resp == "severe" else 0

    # =====================================================
    # Neonatal sex
    # =====================================================

    mapped["neonatal_sex_male"] = 1 if raw.get("neonatal_sex") == "male" else 0

    # =====================================================
    # Gestational age category
    # =====================================================

    ga_cat = raw.get("gestational_age_category")
    mapped["gestational_age_category__34_weeks"] = 1 if ga_cat == "<34 weeks" else 0
    mapped["gestational_age_category__37_weeks"] = 1 if ga_cat == "≥37 weeks" else 0

    # =====================================================
    # APGAR components (already numeric but ensure int)
    # =====================================================

    apgar_fields = [
        "apgar1_appearance",
        "apgar1_pulse",
        "apgar1_grimace",
        "apgar1_activity",
        "apgar1_respiration",
        "apgar5_appearance",
        "apgar5_pulse",
        "apgar5_grimace",
        "apgar5_activity",
        "apgar5_respiration",
    ]

    for f in apgar_fields:
        mapped[f] = int(raw.get(f) or 0)

    return mapped