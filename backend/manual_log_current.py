import pandas as pd
from pathlib import Path
from datetime import date

# -------------------------------
# Resolve project root
# -------------------------------
BASE_DIR = Path(__file__).resolve().parent.parent

# -------------------------------
# Paths
# -------------------------------
INPUT_CSV = BASE_DIR / "data" / "manual_input.csv"
OUTPUT_DIR = BASE_DIR / "data" / "current"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

OUTPUT_PATH = OUTPUT_DIR / f"{date.today().isoformat()}.csv"

# -------------------------------
# Load feature schema
# -------------------------------
import json

FEATURE_ORDER_PATH = BASE_DIR / "backend" / "artifacts" / "feature_order.json"

with open(FEATURE_ORDER_PATH) as f:
    FEATURE_ORDER = json.load(f)["feature_order"]

from septoctor_ml.feature_mapper import map_ui_to_model

raw_df = pd.read_csv(INPUT_CSV)

model_rows = []

for _, row in raw_df.iterrows():
    raw_input = row.to_dict()

    # Map UI/raw input → model feature space
    model_input = map_ui_to_model(raw_input)

    model_rows.append(model_input)

# Create model-space dataframe
df = pd.DataFrame(model_rows)

# Enforce feature order
df = df[FEATURE_ORDER]


# -------------------------------
# Save as current data
# -------------------------------
df.to_csv(
    OUTPUT_PATH,
    mode="a",
    header=not OUTPUT_PATH.exists(),
    index=False
)

print("✅ Current data written to:", OUTPUT_PATH)
print("Rows written:", len(df))
