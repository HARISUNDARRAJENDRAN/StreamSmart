# syntax=docker/dockerfile:1
FROM python:3.11-slim AS builder

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential \
        git \
    && rm -rf /var/lib/apt/lists/*

COPY python_backend/requirements.txt ./requirements.txt

RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --no-cache-dir --root=/install --no-warn-script-location -r requirements.txt \
    && find /tmp -maxdepth 1 -name 'pip-*' -exec rm -rf {} +

FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ffmpeg \
        libgomp1 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /install /

COPY python_backend/ ./

ENV API_HOST=0.0.0.0 \
    API_PORT=8000 \
    API_RELOAD=false

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--log-level", "info"]
