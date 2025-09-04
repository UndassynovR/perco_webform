FROM python:3.13-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Poetry
RUN pip install poetry==1.8.3

# Configure Poetry
ENV POETRY_NO_INTERACTION=1 \
    POETRY_VENV_IN_PROJECT=1 \
    POETRY_CACHE_DIR=/tmp/poetry_cache

WORKDIR /app

# Copy everything (pyproject + lock + src)
COPY . .

# Install dependencies + your package
RUN poetry install

# Create non-root user
RUN useradd --create-home --shell /bin/bash app
USER app

EXPOSE 8080

CMD ["poetry", "run", "gunicorn", "-w", "4", "-b", "0.0.0.0:8080", "perco_webform.server:app"]
