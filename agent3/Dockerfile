FROM python:3.11-slim AS builder
WORKDIR /app

# Build tools
RUN apt-get update && apt-get install -y build-essential gcc && rm -rf /var/lib/apt/lists/*

COPY requirements.txt /app/requirements.txt
RUN pip --disable-pip-version-check --no-cache-dir wheel -r /app/requirements.txt -w /wheels

FROM python:3.11-slim AS runtime
WORKDIR /app

RUN apt-get update && apt-get install -y libgcc1 && rm -rf /var/lib/apt/lists/*

COPY --from=builder /wheels /wheels
COPY requirements.txt /app/requirements.txt
RUN pip --disable-pip-version-check --no-cache-dir install --no-index --find-links=/wheels -r /app/requirements.txt

COPY . /app

ENV PYTHONUNBUFFERED=1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "9000"]
