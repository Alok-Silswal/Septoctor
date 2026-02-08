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

    # Top-5 contributors by absolute impact
    top5 = sorted(
        shap_dict.items(),
        key=lambda x: abs(x[1]),
        reverse=True
    )[:5]

    shap_ui = [
        {
            "feature": feature,
            "impact": float(value)
        }
        for feature, value in top5
    ]

    # ---- Final response ----
    return {
        "sepsis_probability": round(p, 4),
        "sepsis_label": sepsis_label,
        "risk_bucket": risk_bucket,
        "confidence": round(confidence, 4),
        "shap": shap_ui
    }
