# backend/septoctor_ml/main.py

from fastapi import FastAPI
from septoctor_ml.schemas import InferenceRequest
from septoctor_ml.inference import predict_with_explainability

app = FastAPI(
    title="Septoctor ML Inference API",
    version="1.0"
)


@app.post("/predict")
def predict(request: InferenceRequest):
    return predict_with_explainability(request.dict())
