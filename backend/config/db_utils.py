"""
RESTO Database Configuration & Safe URL Sanitizer Utility
Ensures robust parsing of Supabase PostgreSQL connection strings,
Transaction Pooler compatibility, and safe credentials handling without leaking secrets.
"""

import os
import re
import urllib.parse

def clean_database_url_string(raw_url: str) -> str:
    """
    Cleans quotation marks, psql wrappers, brackets, and whitespace from connection strings.
    Handles user copy-paste errors safely.
    """
    if not raw_url:
        return ""
    cleaned = raw_url.strip()
    # Strip shell / psql command wrapper if user copied "psql postgresql://..."
    if cleaned.lower().startswith("psql "):
        cleaned = cleaned[5:].strip()

    # Strip trailing semicolon first
    cleaned = cleaned.rstrip(";").strip()

    # Strip quotes (repeating if wrapped multiple times)
    while (cleaned.startswith('"') and cleaned.endswith('"')) or (cleaned.startswith("'") and cleaned.endswith("'")):
        cleaned = cleaned[1:-1].strip()

    # Strip trailing semicolon again if it was inside the quotes
    cleaned = cleaned.rstrip(";").strip()
    return cleaned

def parse_database_url(raw_url: str, default_ssl: bool = True) -> dict:
    """
    Parses and normalizes a PostgreSQL connection URL into a Django DATABASES configuration dict.
    Safely handles unquoted special characters in passwords and bracketed password placeholders.
    Never prints or leaks database passwords.
    """
    if not raw_url:
        return None

    url_str = clean_database_url_string(raw_url)
    if not url_str:
        return None

    # Pattern: postgres(ql)://<username>:<password>@<host>:<port>/<dbname>?<query>
    pattern = r"^(postgres(?:ql)?):\/\/([^:]+):(.*)@([^@\/:?]+)(?::(\d+))?\/([^?]+)(?:\?(.*))?$"
    match = re.match(pattern, url_str)

    if not match:
        # Check if URL without explicit password/port was provided
        simple_pattern = r"^(postgres(?:ql)?):\/\/([^@\/:?]+)(?::(\d+))?\/([^?]+)(?:\?(.*))?$"
        simple_match = re.match(simple_pattern, url_str)
        if not simple_match:
            return None
        user = ""
        password = ""
        host = simple_match.group(2)
        port = simple_match.group(3) or "5432"
        dbname = simple_match.group(4) or "postgres"
        query = simple_match.group(5) or ""
    else:
        raw_user = match.group(2)
        raw_password = match.group(3)
        host = match.group(4)
        port = match.group(5) or "5432"
        dbname = match.group(6) or "postgres"
        query = match.group(7) or ""

        # Strip literal brackets or quotes if copied as [YOUR-PASSWORD] or "YOUR-PASSWORD"
        if (raw_password.startswith("[") and raw_password.endswith("]")) or \
           (raw_password.startswith('"') and raw_password.endswith('"')) or \
           (raw_password.startswith("'") and raw_password.endswith("'")):
            raw_password = raw_password[1:-1]

        if raw_user.startswith("[") and raw_user.endswith("]"):
            raw_user = raw_user[1:-1]

        user = urllib.parse.unquote(raw_user)
        password = urllib.parse.unquote(raw_password)

    # Validate against placeholder strings
    if "example-project" in host or "placeholder" in host:
        return None

    # Supabase Transaction Pooler check (Port 6543)
    is_transaction_pooler = (str(port) == "6543" or ":6543" in url_str)
    conn_max_age = 0 if is_transaction_pooler else int(os.getenv("DB_CONN_MAX_AGE", "600"))

    # Parse query params for SSL mode
    options = {}
    if query:
        query_params = urllib.parse.parse_qs(query)
        if "sslmode" in query_params:
            options["sslmode"] = query_params["sslmode"][0]

    if default_ssl and "sslmode" not in options:
        options["sslmode"] = "require"

    if is_transaction_pooler:
        options["disable_server_side_cursors"] = True

    return {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": dbname,
        "USER": user,
        "PASSWORD": password,
        "HOST": host,
        "PORT": int(port) if str(port).isdigit() else 5432,
        "CONN_MAX_AGE": conn_max_age,
        "OPTIONS": options,
    }

def sanitize_postgres_url(raw_url: str) -> str:
    """
    Returns an RFC 3986 compliant URL with properly percent-encoded credentials.
    Suitable for libraries that require strictly encoded URIs.
    """
    if not raw_url:
        return ""
    url_str = clean_database_url_string(raw_url)

    pattern = r"^(postgres(?:ql)?):\/\/([^:]+):(.*)@([^@\/:?]+)(?::(\d+))?\/([^?]+)(?:\?(.*))?$"
    match = re.match(pattern, url_str)
    if not match:
        return url_str

    raw_user = match.group(2)
    raw_password = match.group(3)
    host = match.group(4)
    port = match.group(5) or "5432"
    dbname = match.group(6) or "postgres"
    query = match.group(7) or ""

    if (raw_password.startswith("[") and raw_password.endswith("]")) or \
       (raw_password.startswith('"') and raw_password.endswith('"')) or \
       (raw_password.startswith("'") and raw_password.endswith("'")):
        raw_password = raw_password[1:-1]

    if raw_user.startswith("[") and raw_user.endswith("]"):
        raw_user = raw_user[1:-1]

    clean_user = urllib.parse.unquote(raw_user)
    clean_password = urllib.parse.unquote(raw_password)

    encoded_user = urllib.parse.quote(clean_user, safe="")
    encoded_password = urllib.parse.quote(clean_password, safe="")

    normalized = f"postgresql://{encoded_user}:{encoded_password}@{host}:{port}/{dbname}"
    if query:
        normalized += f"?{query}"
    return normalized

def get_safe_diagnostics(raw_url: str, db_config: dict) -> dict:
    """
    Extracts configuration diagnostics without leaking username, password, full URI, or query parameters.
    """
    cleaned = clean_database_url_string(raw_url)
    has_url = bool(cleaned)
    parse_success = bool(db_config is not None and isinstance(db_config, dict))

    if has_url:
        if "://" in cleaned:
            scheme = cleaned.split("://")[0].lower()
        else:
            scheme = "unknown"
    else:
        scheme = "none"

    host = db_config.get("HOST", "") if parse_success else ""
    is_host_valid = bool(
        host and "." in host and " " not in host and "/" not in host and ":" not in host and not host.startswith(".") and not host.endswith(".")
    )

    port = db_config.get("PORT", None) if parse_success else None
    try:
        port_num = int(port)
        is_port_valid = (1 <= port_num <= 65535)
    except (TypeError, ValueError):
        is_port_valid = False

    backend_selected = bool(parse_success and db_config.get("ENGINE") == "django.db.backends.postgresql")

    return {
        "database_url_exists": has_url,
        "uri_parsing_succeeds": parse_success,
        "parsed_scheme": scheme,
        "hostname_validity": "VALID" if is_host_valid else "INVALID",
        "port_validity": "VALID" if is_port_valid else "INVALID",
        "postgresql_backend_selected": backend_selected,
    }

def print_safe_diagnostics(raw_url: str, db_config: dict) -> None:
    """
    Prints strictly formatted safe diagnostics required by Render deployment validation.
    Guarantees 0% credential leakage.
    """
    diag = get_safe_diagnostics(raw_url, db_config)
    print("=== DATABASE CONFIGURATION DIAGNOSTICS ===")
    print(f"DATABASE_URL exists        : {diag['database_url_exists']}")
    print(f"URI parsing succeeds       : {diag['uri_parsing_succeeds']}")
    print(f"Parsed scheme              : {diag['parsed_scheme']}")
    print(f"Hostname validity          : {diag['hostname_validity']}")
    print(f"Port validity              : {diag['port_validity']}")
    print(f"PostgreSQL backend selected: {diag['postgresql_backend_selected']}")
    print("===========================================")

def get_masked_db_summary(db_config: dict) -> str:
    """
    Generates a safe summary of the database configuration without printing passwords.
    """
    if not db_config:
        return "Database: None"
    engine = db_config.get("ENGINE", "").split(".")[-1]
    host = db_config.get("HOST", "local")
    port = db_config.get("PORT", "")
    dbname = db_config.get("NAME", "")
    user = db_config.get("USER", "")
    masked_user = f"{user[:6]}..." if len(user) > 6 else user
    is_pooler = bool(str(port) == "6543")
    ssl = db_config.get("OPTIONS", {}).get("sslmode", "none")

    return (
        f"Database Configured: engine={engine}, host={host}:{port}, db={dbname}, "
        f"user={masked_user}, pooler={is_pooler}, ssl={ssl}"
    )
