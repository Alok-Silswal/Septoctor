# backend/septoctor_ml/main.py

import traceback
from pathlib import Path
from typing import Dict, Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from septoctor_ml.schemas import InferenceRequest
from septoctor_ml.inference import predict_with_explainability
from monitoring.logger import log_current_data


app = FastAPI(
    title="Septoctor ML Inference API",
    version="1.0",
    description="AI-powered neonatal sepsis risk assessment API",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# -----------------------------
# Constants
# -----------------------------
BASE_DIR = Path(__file__).resolve().parent.parent
DRIFT_REPORT_PATH = BASE_DIR / "monitoring" / "reports" / "drift_latest.html"


# -----------------------------
# Health
# -----------------------------
@app.api_route("/", methods=["GET", "HEAD"])
def read_root():
    return {
        "status": "ok",
        "service": "Septoctor ML Inference API",
        "version": "1.0",
        "endpoints": {
            "health": "/health",
            "predict": "/predict (POST)",
            "run_drift": "/run-drift (POST)",
            "drift_report": "/drift-report (GET)",
        },
    }


@app.get("/health")
def health_check():
    return {"status": "healthy", "message": "Septoctor ML API is running"}


# -----------------------------
# Inference
# -----------------------------
@app.post("/predict")
def predict(payload: Dict[str, Any]):
    result = predict_with_explainability(payload)

    # If inference returned an error dict, surface it as a 500 with details
    if "error" in result:
        raise HTTPException(status_code=500, detail=result)

    # Log inputs + prediction for drift monitoring (non-critical — don't let it break the response)
    try:
        log_row = {
            **payload,
            "sepsis_probability": result["sepsis_probability"],
            "sepsis_label": result["sepsis_label"],
        }
        log_current_data(log_row)
    except Exception as log_err:
        print(f"[WARNING] Drift logging failed: {log_err}")

    return result


# -----------------------------
# Drift
# -----------------------------
@app.post("/run-drift")
def run_drift():
    from monitoring.run_drift import run_drift_and_get_html
    path = run_drift_and_get_html()
    return {"status": "ok", "report_path": str(path)}


@app.get("/drift-report")
def drift_report():
    if DRIFT_REPORT_PATH.exists():
        return FileResponse(
            DRIFT_REPORT_PATH,
            media_type="text/html",
            filename="drift_report.html",
        )
    return {"error": "No drift report found. Run /run-drift first."}
