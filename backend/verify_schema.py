import pandas as pd
from pathlib import Path
from datetime import date

# Resolve project root
BASE_DIR = Path(__file__).resolve().parent.parent

REF_PATH = BASE_DIR / "backend" / "artifacts" / "reference_data.csv"
today = date.today().isoformat()
CUR_PATH = BASE_DIR / "data" / "current" / f"{today}.csv"

print("Reference path:", REF_PATH)
print("Current path:", CUR_PATH)

ref = pd.read_csv(REF_PATH)
cur = pd.read_csv(CUR_PATH)

print("Reference columns:", list(ref.columns))
print("Current columns:", list(cur.columns))

assert list(ref.columns) == list(cur.columns), "Schema mismatch!"
print("✅ Schema match confirmed")
