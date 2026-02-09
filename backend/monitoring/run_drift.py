from pathlib import Path
import pandas as pd
from evidently.report import Report
from evidently.metric_preset import DataDriftPreset

BASE_DIR = Path(__file__).resolve().parent.parent

ARTIFACTS_DIR = BASE_DIR / "artifacts"
DATA_DIR = BASE_DIR / "data" / "current"
REPORT_DIR = BASE_DIR / "monitoring" / "reports"
REPORT_DIR.mkdir(parents=True, exist_ok=True)

REPORT_PATH = REPORT_DIR / "drift_latest.html"

def run_drift_and_get_html():
    reference = pd.read_csv(ARTIFACTS_DIR / "reference_data.csv")

    files = sorted(DATA_DIR.glob("*.csv"))
    if not files:
        raise RuntimeError("No current data logged")

    current = pd.read_csv(files[-1])
    current = current[reference.columns]

    report = Report(metrics=[DataDriftPreset()])
    report.run(reference_data=reference, current_data=current)

    report.save_html(REPORT_PATH)
    return REPORT_PATH

