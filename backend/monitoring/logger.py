from pathlib import Path
import pandas as pd
from datetime import datetime
from typing import Dict, Any

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data" / "current"
DATA_DIR.mkdir(parents=True, exist_ok=True)

def log_current_data(row: Dict[str, Any]) -> None:
    df = pd.DataFrame([row])

    ts = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    out = DATA_DIR / f"current_{ts}.csv"

    df.to_csv(out, index=False)
