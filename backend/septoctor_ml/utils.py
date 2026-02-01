# backend/septoctor_ml/utils.py

YES_NO_MAP = {
    "yes": 1,
    "no": 0,
    None: 0
}

# Continuous features scaled using StandardScaler
CONTINUOUS_FEATURES = [
    "prom_duration_hours",
    "maternal_fever_celsius",
    "temperature_celsius",
    "heart_rate_bpm",
]

# Binary / ordinal / flag-like features
BINARY_FEATURES = [
    "prom_present",
    "chorioamnionitis",
    "foul_smelling_liquor",
    "prolonged_labor",
    "unbooked_pregnancy",
    "maternal_uti_sti",
    "meconium_stained_liquor",
    "cotwin_iud",
    "feeding_status",
    "activity_level",
    "respiratory_distress",
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

# Count / ordinal numeric features (not scaled)
COUNT_FEATURES = [
    "pv_examinations_count"
]

# Categorical features for OneHotEncoder
CATEGORICAL_FEATURES = [
    "gestational_age_category",
    "birth_weight_category",
    "neonatal_sex",
]


def map_binary_features(raw: dict) -> dict:
    mapped = {}
    for feature in BINARY_FEATURES:
        value = raw.get(feature, None)
        if isinstance(value, str):
            value = value.lower()
        mapped[feature] = YES_NO_MAP.get(value, 0)
    return mapped


def extract_continuous_features(raw: dict) -> dict:
    values = {}
    for feature in CONTINUOUS_FEATURES:
        val = raw.get(feature, None)
        values[feature] = float(val) if val is not None else None
    return values


def extract_count_features(raw: dict) -> dict:
    values = {}
    for feature in COUNT_FEATURES:
        val = raw.get(feature, None)
        values[feature] = int(val) if val is not None else 0
    return values


def extract_categorical_features(raw: dict) -> dict:
    values = {}
    for feature in CATEGORICAL_FEATURES:
        val = raw.get(feature, None)
        values[feature] = val if val is not None else "unknown"
    return values


def normalize_raw_input(raw: dict) -> dict:
    normalized = {}
    normalized.update(map_binary_features(raw))
    normalized.update(extract_continuous_features(raw))
    normalized.update(extract_count_features(raw))
    normalized.update(extract_categorical_features(raw))
    return normalized
