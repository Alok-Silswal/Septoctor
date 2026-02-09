# backend/septoctor_ml/main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from septoctor_ml.schemas import InferenceRequest
from septoctor_ml.inference import predict_with_explainability

app = FastAPI(
    title="Septoctor ML Inference API",
    version="1.0",
    description="AI-powered neonatal sepsis risk assessment API"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root():
    """Health check endpoint"""
    return {
        "status": "ok",
        "service": "Septoctor ML Inference API",
        "version": "1.0",
        "endpoints": {
            "health": "/health",
            "predict": "/predict (POST)"
        }
    }


@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "message": "Septoctor ML API is running"
    }


@app.post("/predict")
def predict(request: InferenceRequest):
    """Predict sepsis risk with explainability"""
    return predict_with_explainability(request.dict())
