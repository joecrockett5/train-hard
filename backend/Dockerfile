# Python 3.11 to match the runtime the Lambda deployment used, so the pinned
# requirements resolve to the same wheels they were pinned against.
FROM python:3.11-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Dependencies first, so edits to application code do not invalidate the
# layer that installs them.
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY pyproject.toml ./
COPY src/ ./src/
RUN pip install --no-cache-dir --no-deps -e .

# Non-root. Owns /app so the editable install's egg-info stays writable.
RUN useradd --create-home --uid 1000 app && chown -R app:app /app
USER app

EXPOSE 8000

CMD ["uvicorn", "hard.app.main:app", "--host", "0.0.0.0", "--port", "8000"]


# Test image: adds the dev dependencies and the suite. Built by the `test`
# profile in docker-compose.yml.
FROM base AS test

USER root
COPY dev-requirements.txt ./
RUN pip install --no-cache-dir -r dev-requirements.txt
COPY tests/ ./tests/
RUN chown -R app:app /app
USER app

CMD ["pytest", "-v"]
