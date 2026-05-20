# Multi-stage build: build wheels in builder stage, install into smaller runtime image
FROM python:3.11-slim AS builder
WORKDIR /app

# Build dependencies for compiling wheels
RUN apt-get update && apt-get install -y build-essential gcc git && rm -rf /var/lib/apt/lists/*

COPY requirements.txt /app/requirements.txt
# Build wheels for all requirements to avoid compiling in the runtime stage
RUN pip --disable-pip-version-check --no-cache-dir wheel -r /app/requirements.txt -w /wheels

FROM python:3.11-slim AS runtime
WORKDIR /app

# Minimal runtime deps (if specific system libs are needed, add them here)
RUN apt-get update && apt-get install -y libgcc1 && rm -rf /var/lib/apt/lists/*

# Copy wheels from builder and install
COPY --from=builder /wheels /wheels
COPY requirements.txt /app/requirements.txt
RUN pip --disable-pip-version-check --no-cache-dir install --no-index --find-links=/wheels -r /app/requirements.txt

# Copy application code
COPY . /app

ENV PYTHONUNBUFFERED=1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
