from pathlib import Path
import pandas as pd

from evidently.report import Report
from evidently.metrics import DataDriftTable

# --------------------------------------------------
# Resolve project root
# --------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent.parent.parent

REFERENCE_PATH = BASE_DIR / "backend" / "artifacts" / "reference_data.csv"
CURRENT_DIR = BASE_DIR / "data" / "current"

# --------------------------------------------------
# Load reference data
# --------------------------------------------------
reference = pd.read_csv(REFERENCE_PATH)

# --------------------------------------------------
# Load latest current data automatically
# --------------------------------------------------
current_files = sorted(CURRENT_DIR.glob("*.csv"))
if not current_files:
    raise RuntimeError("No current data files found in data/current")

latest_current = current_files[-1]
current = pd.read_csv(latest_current)

print("Using current data:", latest_current.name)

# --- Drop prediction column if present ---
PRED_COL = "sepsis_probability"

if PRED_COL in reference.columns:
    reference = reference.drop(columns=[PRED_COL])

if PRED_COL in current.columns:
    current = current.drop(columns=[PRED_COL])

# --------------------------------------------------
# Run drift report
# --------------------------------------------------
report = Report(metrics=[DataDriftTable()])
report.run(
    reference_data=reference,
    current_data=current
)

# --------------------------------------------------
# Save HTML report (STABLE API)
# --------------------------------------------------
out = (
    BASE_DIR
    / "backend"
    / "monitoring"
    / f"drift_report_{latest_current.stem}.html"
)

report.save_html(str(out))

print("Drift report saved to:", out)
