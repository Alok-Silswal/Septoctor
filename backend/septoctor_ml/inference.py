import json
import joblib
import numpy as np
import pandas as pd
import shap
from pathlib import Path
from monitoring.logger import log_current_data
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
# Preprocessing (STRICT + SAFE)
# ======================================================

def preprocess(model_ready_input: dict) -> pd.DataFrame:
    """
    Ensures:
    - no missing columns
    - correct order
    - zero-filled defaults
    """
    row = {}
    for col in FEATURE_ORDER:
        row[col] = model_ready_input.get(col, 0)

    df = pd.DataFrame([row])
    return df


# ======================================================
# Prediction + Explainability
# ======================================================

def predict_with_explainability(raw_input: dict) -> dict:
    try:
        # ---- Step 1: UI → model feature mapping ----
        model_input = map_ui_to_model(raw_input)

        # ---- Step 2: preprocess ----
        X = preprocess(model_input)

        # 🔴 CRITICAL: LOG MODEL INPUT FOR DRIFT
        log_current_data(X)

        # ---- Step 3: probability ----
        p = float(model.predict_proba(X)[0, 1])

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
        shap_values = explainer.shap_values(X)

        if isinstance(shap_values, list):
            shap_values = shap_values[0]

        shap_values = shap_values[0]

        shap_dict = dict(zip(FEATURE_ORDER, shap_values))

        # Sort by absolute impact
        all_sorted = sorted(
            shap_dict.items(),
            key=lambda x: abs(x[1]),
            reverse=True
        )

        # Top-5 contributors
        top5 = all_sorted[:5]

        shap_top5 = [
            {
                "feature": feature,
                "display_name": _display_name(_normalize_feature(feature)),
                "impact": float(value),
            }
            for feature, value in top5
        ]

        shap_all = [
            {
                "feature": feature,
                "display_name": _display_name(_normalize_feature(feature)),
                "impact": float(value),
            }
            for feature, value in all_sorted
        ]

        expected = explainer.expected_value
        if isinstance(expected, (list, np.ndarray)):
            expected = expected[0]

        return {
            "sepsis_probability": round(p, 4),
            "sepsis_label": sepsis_label,
            "risk_bucket": risk_bucket,
            "confidence": round(confidence, 4),
            "shap_top5": shap_top5,
            "shap_all_features": shap_all,
            "shap_expected_value": round(float(expected), 4),
        }

    except Exception as e:
        return {
            "error": "Inference pipeline failure",
            "details": str(e)
        }


# ======================================================
# Feature name normalization
# ======================================================

def _normalize_feature(feature: str) -> str:
    return feature.replace("__", "_")


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
    "prom_present": "PROM Present",
    "chorioamnionitis": "Chorioamnionitis",
    "foul_smelling_liquor": "Foul-Smelling Liquor",
    "prolonged_labor": "Prolonged Labor",
    "unbooked_pregnancy": "Unbooked Pregnancy",
    "maternal_uti_sti": "Maternal UTI / STI",
    "meconium_stained_liquor": "Meconium-Stained Liquor",
    "cotwin_iud": "Co-twin IUD",
    "apnea_present": "Apnea Present",
    "shock_present": "Shock Present",
    "hss_tlc_abnormal": "HSS TLC Abnormal",
    "hss_anc_abnormal": "HSS ANC Abnormal",
    "hss_it_ratio_high": "HSS I:T Ratio High",
    "hss_im_ratio_high": "HSS I:M Ratio High",
    "hss_platelet_low": "HSS Platelet Low",
    "hss_neutrophil_degeneration": "Neutrophil Degeneration",
    "hss_nrbc_elevated": "NRBC Elevated",
    "resuscitation_required": "Resuscitation Required",
    "feeding_status_normal": "Feeding Normal",
    "feeding_status_poor": "Feeding Poor",
    "activity_level_lethargic": "Activity Lethargic",
    "respiratory_distress_none": "No Respiratory Distress",
    "respiratory_distress_severe": "Severe Respiratory Distress",
    "neonatal_sex_male": "Sex: Male",
    "neonatal_sex_female": "Sex: Female",
    "apgar5_appearance": "APGAR-5 Appearance",
    "apgar5_pulse": "APGAR-5 Pulse",
    "apgar5_grimace": "APGAR-5 Grimace",
    "apgar5_activity": "APGAR-5 Activity",
    "apgar5_respiration": "APGAR-5 Respiration",
}


def _display_name(feature: str) -> str:
    return _DISPLAY_NAMES.get(feature, feature.replace("_", " ").title())
