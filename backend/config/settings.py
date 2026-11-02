"""
Django settings for RESTO backend.
"""
import os
from pathlib import Path
import dj_database_url
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent

# Load environment variables
load_dotenv(BASE_DIR / ".env")

SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "resto-django-production-secure-key-998877665544332211")
DEBUG = os.getenv("DJANGO_DEBUG", "False").lower() in ("true", "1", "yes")

ALLOWED_HOSTS = [
    host.strip()
    for host in os.getenv(
        "DJANGO_ALLOWED_HOSTS",
        "localhost,127.0.0.1,0.0.0.0,resto-vc53.onrender.com,resto-hazel-three.vercel.app,resto-bejw.vercel.app,*"
    ).split(",")
    if host.strip()
]

INSTALLED_APPS = [
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.staticfiles",
    "rest_framework",
    "corsheaders",
    "apps.restaurants",
    "apps.tables",
    "apps.menu",
    "apps.orders",
    "apps.payments",
    "apps.service_requests",
    "apps.dashboard",
    "apps.realtime",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "config.middleware.SecurityHeadersMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

# Database Configuration (Supabase PostgreSQL as Single Source of Truth)
from config.db_utils import parse_database_url, get_masked_db_summary
from django.core.exceptions import ImproperlyConfigured

DATABASE_URL = os.getenv("DATABASE_URL", "").strip()
db_config = parse_database_url(DATABASE_URL)

if db_config:
    DATABASES = {"default": db_config}
    # Log safe summary without exposing passwords
    print(f"[SETTINGS] {get_masked_db_summary(db_config)}")
else:
    if not DEBUG:
        # STRICT PRODUCTION REQUIREMENT: Never silently enable SQLite in production
        raise ImproperlyConfigured(
            "CRITICAL: DATABASE_URL pointing to Supabase PostgreSQL is required in production. "
            "SQLite fallback is strictly prohibited in production. "
            "Ensure DATABASE_URL is configured in Render environment variables."
        )
    # Local development fallback only when DJANGO_DEBUG=True
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
            "OPTIONS": {
                "timeout": 20,
            },
        }
    }

AUTH_PASSWORD_VALIDATORS = []

LANGUAGE_CODE = "en-us"
TIME_ZONE = "Asia/Kolkata"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# Security Hardening Settings
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"
SECURE_BROWSER_XSS_FILTER = True
SECURE_REFERRER_POLICY = "strict-origin-when-cross-origin"
SECURE_CROSS_ORIGIN_OPENER_POLICY = None

# CORS Configuration
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = False
CORS_ALLOW_HEADERS = [
    "accept",
    "accept-encoding",
    "authorization",
    "content-type",
    "dnt",
    "origin",
    "user-agent",
    "x-csrftoken",
    "x-requested-with",
    "idempotency-key",
    "x-staff-internal",
    "x-staff-token",
    "x-dashboard-token",
    "x-restaurant-slug",
]

# REST Framework Configuration with Throttling and Exception Handling
REST_FRAMEWORK = {
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
    ],
    "DEFAULT_PARSER_CLASSES": [
        "rest_framework.parsers.JSONParser",
        "rest_framework.parsers.FormParser",
    ],
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": "300/minute",
        "user": "600/minute",
    },
    "EXCEPTION_HANDLER": "config.exceptions.custom_exception_handler",
    "UNAUTHENTICATED_USER": None,
}

# Restaurant Scoping & Tracking Tokens
DEFAULT_RESTAURANT_SLUG = os.getenv("DEFAULT_RESTAURANT_SLUG", "olive-and-ember")
TRACKING_TOKEN_SECRET = os.getenv("TRACKING_TOKEN_SECRET", "resto-demo-secret-key-1234567890")
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

