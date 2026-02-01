# backend/septoctor_ml/inference.py

import json
import joblib
import numpy as np
import pandas as pd
import shap
from pathlib import Path

from septoctor_ml.utils import normalize_raw_input, CONTINUOUS_FEATURES

# ---- Load artifacts (ONCE) ----
BASE_DIR = Path(__file__).resolve().parent.parent

ARTIFACTS_DIR = BASE_DIR / "artifacts"

MODEL_PATH = ARTIFACTS_DIR / "septoctor_rf_model.joblib"
SCALER_PATH = ARTIFACTS_DIR / "septoctor_scaler.joblib"
OHE_PATH = ARTIFACTS_DIR / "septoctor_ohe.joblib"
FEATURE_ORDER_PATH = ARTIFACTS_DIR / "feature_order.json"


model = joblib.load(MODEL_PATH)
scaler = joblib.load(SCALER_PATH)
ohe = joblib.load(OHE_PATH)

with open(FEATURE_ORDER_PATH, "r") as f:
    FEATURE_ORDER = json.load(f)

explainer = shap.TreeExplainer(model)


def preprocess(raw_input: dict) -> pd.DataFrame:
    normalized = normalize_raw_input(raw_input)
    df = pd.DataFrame([normalized])

    # ----- Continuous scaling -----
    cont_df = df[CONTINUOUS_FEATURES].copy()

    # Replace None with scaler mean (baseline → 0 after scaling)
    for i, col in enumerate(CONTINUOUS_FEATURES):
        cont_df[col] = cont_df[col].fillna(scaler.mean_[i])

    cont_scaled = scaler.transform(cont_df)
    cont_scaled_df = pd.DataFrame(
        cont_scaled,
        columns=CONTINUOUS_FEATURES
    )

    # ----- Non-scaled numeric & binary -----
    other_numeric_cols = [
        c for c in df.columns
        if c not in CONTINUOUS_FEATURES
        and c not in ohe.feature_names_in_
    ]
    other_numeric_df = df[other_numeric_cols].astype(float)

    # ----- Categorical encoding -----
    cat_df = df[ohe.feature_names_in_]
    cat_encoded = ohe.transform(cat_df)
    cat_encoded_df = pd.DataFrame(
        cat_encoded,
        columns=ohe.get_feature_names_out(ohe.feature_names_in_)
    )

    # ----- Combine -----
    X = pd.concat(
        [other_numeric_df, cont_scaled_df, cat_encoded_df],
        axis=1
    )

    # ----- Enforce feature order -----
    X = X[FEATURE_ORDER]

    return X


def predict_with_explainability(raw_input: dict) -> dict:
    X = preprocess(raw_input)

    probability = float(model.predict_proba(X)[0, 1])

    shap_values = explainer.shap_values(X)
    shap_sample = shap_values[1][0]

    shap_df = pd.DataFrame({
        "feature": X.columns,
        "shap_value": shap_sample
    })

    top_contributors = (
        shap_df[shap_df.shap_value > 0]
        .sort_values("shap_value", ascending=False)
        .head(5)
    )

    return {
        "sepsis_probability": round(probability, 4),
        "risk_label": "HIGH" if probability >= 0.5 else "LOW",
        "top_contributing_factors": top_contributors.to_dict(orient="records")
    }
