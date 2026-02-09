FROM python:3.11-slim

WORKDIR /app

# Install dependencies first (layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create data directory for drift logging
RUN mkdir -p data/current

EXPOSE 8000

CMD ["uvicorn", "septoctor_ml.main:app", "--host", "0.0.0.0", "--port", "8000"]
