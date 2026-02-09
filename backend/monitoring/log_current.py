from pathlib import Path
import pandas as pd
from datetime import datetime

BASE_DIR = Path("/app")
CURRENT_DIR = BASE_DIR / "data" / "current"
CURRENT_DIR.mkdir(parents=True, exist_ok=True)

def log_current_row(df: pd.DataFrame):
    ts = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    path = CURRENT_DIR / f"current_{ts}.csv"
    df.to_csv(path, index=False)

