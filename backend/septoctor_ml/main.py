from fastapi import FastAPI
from typing import Dict, Any
from pathlib import Path
from fastapi.responses import FileResponse, HTMLResponse
from monitoring.logger import log_current_data

from septoctor_ml.inference import predict_with_explainability
from monitoring.run_drift import run_drift_and_get_html


app = FastAPI(
    title="Septoctor ML Inference API",
    version="1.0",
    description="AI-powered neonatal sepsis risk assessment API",
)


# -----------------------------
# Constants (Cloud Run safe)
# -----------------------------
BASE_DIR = Path("/app")
DRIFT_REPORT_PATH = BASE_DIR / "artifacts" / "drift_report.html"


# -----------------------------
# Health
# -----------------------------
@app.get("/")
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
    return {"status": "healthy"}


# -----------------------------
# Inference
# -----------------------------
@app.post("/predict")
def predict(payload: Dict[str, Any]):
    return predict_with_explainability(payload)


# -----------------------------
# Drift
# -----------------------------
@app.post("/predict")
def predict(payload: Dict[str, Any]):
    result = predict_with_explainability(payload)

    # Merge inputs + prediction for drift
    log_row = {
        **payload,
        "sepsis_probability": result["sepsis_probability"],
        "sepsis_label": result["sepsis_label"],
    }

    log_current_data(log_row)

    return result

@app.post("/run-drift")
def run_drift():
    path = run_drift_and_get_html()
    return {"status": "ok"}

@app.get("/drift-report")
def drift_report():
    return FileResponse(
        "/app/artifacts/drift_report.html",
        media_type="text/html"
    )

    return FileResponse(
        DRIFT_REPORT_PATH,
        media_type="text/html",
        filename="drift_report.html",
    )
