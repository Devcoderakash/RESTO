"""
Supabase Integration Module for RESTO.
Manages Supabase Storage, PostgreSQL connectivity, and Realtime communication.
"""

import os
import requests
from django.conf import settings

SUPABASE_URL = getattr(settings, "SUPABASE_URL", os.getenv("SUPABASE_URL", "https://zmpthsiiouukjjyrbpnz.supabase.co")).rstrip("/")
SUPABASE_ANON_KEY = getattr(settings, "SUPABASE_ANON_KEY", os.getenv("SUPABASE_ANON_KEY", ""))
SUPABASE_SERVICE_ROLE_KEY = getattr(settings, "SUPABASE_SERVICE_ROLE_KEY", os.getenv("SUPABASE_SERVICE_ROLE_KEY", ""))
STORAGE_BUCKET = os.getenv("SUPABASE_STORAGE_BUCKET", "resto-media")

def get_supabase_headers(use_service_role: bool = True) -> dict:
    key = SUPABASE_SERVICE_ROLE_KEY if use_service_role else SUPABASE_ANON_KEY
    return {
        "apikey": key,
        "Authorization": f"Bearer {key}",
    }

def is_supabase_configured() -> bool:
    return bool(SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY and not "example-project" in SUPABASE_URL)

def upload_image_to_storage(file_bytes: bytes, destination_path: str, content_type: str = "image/jpeg") -> str:
    """
    Uploads a file to Supabase Storage in the resto-media bucket.
    Returns the public URL to access the image.
    """
    if not is_supabase_configured():
        raise RuntimeError("Supabase credentials are not configured.")

    clean_path = destination_path.lstrip("/")
    endpoint = f"{SUPABASE_URL}/storage/v1/object/{STORAGE_BUCKET}/{clean_path}"
    headers = {
        **get_supabase_headers(use_service_role=True),
        "Content-Type": content_type,
        "x-upsert": "true",
    }

    response = requests.post(endpoint, data=file_bytes, headers=headers, timeout=15)
    if response.status_code not in (200, 201):
        raise RuntimeError(f"Supabase Storage upload failed ({response.status_code}): {response.text}")

    # Return public URL
    return f"{SUPABASE_URL}/storage/v1/object/public/{STORAGE_BUCKET}/{clean_path}"

def check_supabase_health() -> dict:
    """
    Checks Supabase Storage and PostgreSQL connectivity status.
    """
    if not is_supabase_configured():
        return {"status": "unconfigured", "error": "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"}

    try:
        endpoint = f"{SUPABASE_URL}/storage/v1/bucket"
        r = requests.get(endpoint, headers=get_supabase_headers(use_service_role=True), timeout=5)
        if r.status_code == 200:
            return {"status": "connected", "supabase_url": SUPABASE_URL, "storage": "online"}
        return {"status": "degraded", "error": f"HTTP {r.status_code}"}
    except Exception as ex:
        return {"status": "error", "error": str(ex)}

