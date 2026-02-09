from pathlib import Path
import pandas as pd
from evidently.report import Report
from evidently.metric_preset import DataDriftPreset

BASE_DIR = Path("/app")

ARTIFACTS_DIR = BASE_DIR / "artifacts"
DATA_DIR = BASE_DIR / "data" / "current"
REPORT_DIR = BASE_DIR / "artifacts"

REPORT_PATH = REPORT_DIR / "drift_latest.html"

def run_drift_and_get_html():
    reference = pd.read_csv("/app/artifacts/reference_data.csv")

    files = sorted(Path("/app/data/current").glob("*.csv"))
    if not files:
        raise RuntimeError("No current data logged")

    current = pd.read_csv(files[-1])
    current = current[reference.columns]

    report = Report(metrics=[DataDriftPreset()])
    report.run(reference_data=reference, current_data=current)

    out = Path("/app/artifacts/drift_report.html")
    report.save_html(out)
    return out

