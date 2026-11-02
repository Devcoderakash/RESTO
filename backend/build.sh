#!/usr/bin/env bash
# Exit immediately on error
set -o errexit
set -o pipefail

echo "=== RESTO PRODUCTION BUILD START ==="
pip install --upgrade pip
pip install -r requirements.txt

echo "=== VALIDATING DATABASE CONFIGURATION ==="
python manage.py check --database default

echo "=== EXECUTING DATABASE MIGRATIONS ==="
python manage.py migrate --fake-initial --no-input

echo "=== VERIFYING DATABASE SEED STATE ==="
python seed_data.py

echo "=== RESTO PRODUCTION BUILD COMPLETED SUCCESSFULLY ==="


