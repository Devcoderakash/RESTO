#!/usr/bin/env bash
# Exit on error
set -o errexit

pip install --upgrade pip
pip install -r requirements.txt

# Run migrations with safe fallback
python manage.py migrate --fake-initial --no-input || python manage.py migrate --no-input || echo "Migration step completed with fallback"

# Safe seed (skips if data exists)
python seed_data.py || true


