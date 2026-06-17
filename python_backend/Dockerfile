# StreamSmart Backend Dockerfile
# Multi-stage build optimized for smaller runtime image size

FROM python:3.10-slim AS builder

ENV PYTHONDONTWRITEBYTECODE=1 \
  PYTHONUNBUFFERED=1 \
  PIP_NO_CACHE_DIR=1

WORKDIR /build

# Compile wheels in builder image only
RUN apt-get update && apt-get install -y --no-install-recommends \
  build-essential \
  && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN python -m pip install --upgrade pip setuptools wheel && \
  pip wheel --no-cache-dir --wheel-dir /wheels -r requirements.txt


FROM python:3.10-slim AS runtime

ENV PORT=8000 \
  PYTHONDONTWRITEBYTECODE=1 \
  PYTHONUNBUFFERED=1

WORKDIR /app

# Runtime-only native dependency for numpy/scikit-learn
RUN apt-get update && apt-get install -y --no-install-recommends \
  libgomp1 \
  && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
COPY --from=builder /wheels /wheels

RUN python -m pip install --upgrade pip && \
  pip install --no-cache-dir --no-index --find-links=/wheels -r requirements.txt && \
  rm -rf /wheels

COPY . .

RUN useradd --system --create-home appuser && \
  chown -R appuser:appuser /app

USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
