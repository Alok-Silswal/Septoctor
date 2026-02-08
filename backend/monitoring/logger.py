import os
from datetime import date
import pandas as pd

def log_current_data(X_current: pd.DataFrame):
    """
    Append model-input data for drift monitoring.
    """
    os.makedirs("data/current", exist_ok=True)

    today = date.today().isoformat()
    path = f"data/current/{today}.csv"

    X_current.to_csv(
        path,
        mode="a",
        header=not os.path.exists(path),
        index=False
    )
