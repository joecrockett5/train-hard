# syntax=docker/dockerfile:1

# Python 3.11 to match the runtime the Lambda deployment used, so the pinned
# requirements resolve to the same wheels they were pinned against.
ARG PYTHON_VERSION=3.11

# ---- builder --------------------------------------------------------------
# Installs into a prefix that the runtime stage copies over /usr/local. Keeps
# pip's cache and any wheel-building leftovers out of the shipped image.
FROM python:${PYTHON_VERSION}-slim AS builder

ENV PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

COPY pyproject.toml ./
COPY src/ ./src/
RUN pip install --no-cache-dir --prefix=/install --no-deps .


# ---- runtime --------------------------------------------------------------
FROM python:${PYTHON_VERSION}-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY --from=builder /install /usr/local

RUN useradd --create-home --uid 1000 app && chown -R app:app /app

# Progress photos are written here, onto a named volume. The directory is
# created and chowned in the image rather than at runtime because Docker
# seeds a new named volume from the image's directory, ownership included --
# so the volume comes up writable by `app` without this service running as
# root the way DynamoDB Local has to.
RUN mkdir -p /photos && chown app:app /photos

USER app

EXPOSE 8000

CMD ["uvicorn", "hard.app.main:app", "--host", "0.0.0.0", "--port", "8000"]


# ---- development ----------------------------------------------------------
# Adds the file watcher uvicorn --reload needs, and installs the package in
# editable mode so the bind-mounted source is what runs.
FROM base AS development

USER root
COPY requirements.txt dev-requirements.txt pyproject.toml ./
RUN pip install --no-cache-dir -r dev-requirements.txt
COPY src/ ./src/
RUN pip install --no-cache-dir --no-deps -e . && chown -R app:app /app
USER app


# ---- test -----------------------------------------------------------------
FROM development AS test

USER root
COPY tests/ ./tests/
RUN chown -R app:app /app
USER app

CMD ["pytest", "-v"]
