# backend/config.py
import json

ARTIFACTS_DIR = "artifacts"

MODEL_PATH = f"{ARTIFACTS_DIR}/septoctor_lr.pkl"
FEATURE_ORDER_PATH = f"{ARTIFACTS_DIR}/feature_order.json"
REFERENCE_DATA_PATH = f"{ARTIFACTS_DIR}/reference_data.csv"

with open(FEATURE_ORDER_PATH) as f:
    FEATURE_SCHEMA = json.load(f)
