import json
import joblib
import numpy as np
import pandas as pd
import shap
from pathlib import Path
from backend.monitoring.logger import log_current_data

from septoctor_ml.feature_mapper import map_ui_to_model

# ======================================================
# Load artifacts ONCE at startup
# ======================================================

BASE_DIR = Path(__file__).resolve().parent.parent
ARTIFACTS_DIR = BASE_DIR / "artifacts"

PKL_PATH = ARTIFACTS_DIR / "septoctor_lr.pkl"
FEATURE_ORDER_PATH = ARTIFACTS_DIR / "feature_order.json"
SHAP_BG_PATH = ARTIFACTS_DIR / "shap_background.npy"

# ---- Load trained model artifact ----
artifact = joblib.load(PKL_PATH)

model = artifact["model"]
KS_THRESHOLD = artifact["ks_threshold"]
MODERATE_THRESHOLD = artifact["moderate_threshold"]

# ---- Load feature order ----
with open(FEATURE_ORDER_PATH, "r") as f:
    FEATURE_ORDER = json.load(f)["feature_order"]

# ---- Load SHAP background ----
X_background = pd.DataFrame(
    np.load(SHAP_BG_PATH),
    columns=FEATURE_ORDER
)

# ---- Initialize SHAP explainer (ONCE) ----
explainer = shap.LinearExplainer(
    model,
    X_background,
    feature_perturbation="interventional"
)

# ======================================================
# Preprocessing (STRICT: no scaling, no encoding)
# ======================================================

def preprocess(model_ready_input: dict) -> pd.DataFrame:
    """
    model_ready_input: numeric, model-space features
    """
    df = pd.DataFrame([model_ready_input])

    # Fill missing with 0 (clinical baseline)
    df = df.fillna(0)

    # Enforce exact feature order
    df = df[FEATURE_ORDER]

    return df


# ======================================================
# Prediction + Explainability
# ======================================================

def predict_with_explainability(raw_input: dict) -> dict:
    """
    raw_input: UI-level semantic input (strings, numbers)
    """

    # ---- Step 1: UI → model feature mapping ----
    model_input = map_ui_to_model(raw_input)

    # ---- Step 2: preprocess ----
    X = preprocess(model_input)

    # ---- Step 3: probability ----
    p = float(model.predict_proba(X)[0, 1])
    # ---- Step 3.1: log model input for drift detection ----
    log_current_data(X)

    # ---- Step 4: binary decision ----
    sepsis_label = int(p >= KS_THRESHOLD)

    # ---- Step 5: risk bucket ----
    if p >= KS_THRESHOLD:
        risk_bucket = "High"
    elif p >= MODERATE_THRESHOLD:
        risk_bucket = "Moderate"
    else:
        risk_bucket = "Low"

    # ---- Step 6: confidence ----
    confidence = abs(p - KS_THRESHOLD)

    # ---- Step 7: SHAP explainability ----
    shap_values = explainer.shap_values(X)[0]
    shap_dict = dict(zip(FEATURE_ORDER, shap_values))

    # All features sorted by absolute impact
    all_sorted = sorted(
        shap_dict.items(),
        key=lambda x: abs(x[1]),
        reverse=True
    )

    # Top-5 contributors
    top5 = all_sorted[:5]

    shap_ui = [
        {
            "feature": feature,
            "display_name": _display_name(feature),
            "impact": float(value),
        }
        for feature, value in top5
    ]

    # All features for chatbot context
    shap_all = [
        {
            "feature": feature,
            "display_name": _display_name(feature),
            "impact": float(value),
        }
        for feature, value in all_sorted
    ]

    # ---- Final response ----
    return {
        "sepsis_probability": round(p, 4),
        "sepsis_label": sepsis_label,
        "risk_bucket": risk_bucket,
        "confidence": round(confidence, 4),
        "shap_top5": shap_ui,
        "shap_all_features": shap_all,
        "shap_expected_value": round(float(explainer.expected_value), 4),
    }


# ======================================================
# Human-readable display names
# ======================================================

_DISPLAY_NAMES = {
    "prom_duration_hours": "PROM Duration (hrs)",
    "maternal_fever_celsius": "Maternal Fever (°C)",
    "temperature_celsius": "Body Temperature (°C)",
    "heart_rate_bpm": "Heart Rate (bpm)",
    "pv_examinations_count": "PV Examinations Count",
    "gestational_age_weeks": "Gestational Age (weeks)",
    "birth_weight_grams": "Birth Weight (g)",
    "prom_present_yes": "PROM Present",
    "chorioamnionitis_yes": "Chorioamnionitis",
    "foul_smelling_liquor_yes": "Foul-Smelling Liquor",
    "prolonged_labor_yes": "Prolonged Labor",
    "unbooked_pregnancy_yes": "Unbooked Pregnancy",
    "maternal_uti_sti_yes": "Maternal UTI / STI",
    "meconium_stained_liquor_yes": "Meconium-Stained Liquor",
    "cotwin_iud_yes": "Co-twin IUD",
    "apnea_present_yes": "Apnea Present",
    "shock_present_yes": "Shock Present",
    "hss_tlc_abnormal_yes": "HSS TLC Abnormal",
    "hss_anc_abnormal_yes": "HSS ANC Abnormal",
    "hss_it_ratio_high_yes": "HSS I:T Ratio High",
    "hss_im_ratio_high_yes": "HSS I:M Ratio High",
    "hss_platelet_low_yes": "HSS Platelet Low",
    "hss_neutrophil_degeneration_yes": "Neutrophil Degeneration",
    "hss_nrbc_elevated_yes": "NRBC Elevated",
    "resuscitation_required_yes": "Resuscitation Required",
    "feeding_status_normal": "Feeding Normal",
    "feeding_status_poor": "Feeding Poor",
    "activity_level_lethargic": "Activity Lethargic",
    "respiratory_distress_none": "No Respiratory Distress",
    "respiratory_distress_severe": "Severe Resp. Distress",
    "neonatal_sex_male": "Sex: Male",
    "gestational_age_category__34_weeks": "GA < 34 weeks",
    "gestational_age_category__37_weeks": "GA ≥ 37 weeks",
    "apgar1_appearance": "APGAR-1 Appearance",
    "apgar1_pulse": "APGAR-1 Pulse",
    "apgar1_grimace": "APGAR-1 Grimace",
    "apgar1_activity": "APGAR-1 Activity",
    "apgar1_respiration": "APGAR-1 Respiration",
    "apgar5_appearance": "APGAR-5 Appearance",
    "apgar5_pulse": "APGAR-5 Pulse",
    "apgar5_grimace": "APGAR-5 Grimace",
    "apgar5_activity": "APGAR-5 Activity",
    "apgar5_respiration": "APGAR-5 Respiration",
}


def _display_name(feature: str) -> str:
    return _DISPLAY_NAMES.get(feature, feature.replace("_", " ").title())
