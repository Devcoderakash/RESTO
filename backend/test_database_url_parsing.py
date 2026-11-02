"""
RESTO: Database URL Parsing & Security Test Suite
Tests PostgreSQL URI parsing, password decoding/encoding, special characters handling,
Render Transaction Pooler configuration, and ensures zero credential exposure in logs.
"""

import os
import sys
import unittest
from django.core.exceptions import ImproperlyConfigured

# Ensure backend root is in python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config.db_utils import parse_database_url, sanitize_postgres_url, get_masked_db_summary

class TestDatabaseUrlParsing(unittest.TestCase):

    def test_standard_pooler_url(self):
        url = "postgresql://postgres.zmpthsiiouukjjyrbpnz:plainpass123@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require"
        cfg = parse_database_url(url)
        self.assertIsNotNone(cfg)
        self.assertEqual(cfg["ENGINE"], "django.db.backends.postgresql")
        self.assertEqual(cfg["HOST"], "aws-0-ap-south-1.pooler.supabase.com")
        self.assertEqual(cfg["PORT"], 6543)
        self.assertEqual(cfg["USER"], "postgres.zmpthsiiouukjjyrbpnz")
        self.assertEqual(cfg["PASSWORD"], "plainpass123")
        self.assertEqual(cfg["NAME"], "postgres")
        self.assertEqual(cfg["CONN_MAX_AGE"], 0)  # Port 6543 requires conn_max_age = 0
        self.assertEqual(cfg["OPTIONS"]["disable_server_side_cursors"], True)
        self.assertEqual(cfg["OPTIONS"]["sslmode"], "require")

    def test_direct_session_url(self):
        url = "postgresql://postgres.zmpthsiiouukjjyrbpnz:plainpass123@db.zmpthsiiouukjjyrbpnz.supabase.co:5432/postgres?sslmode=require"
        cfg = parse_database_url(url)
        self.assertIsNotNone(cfg)
        self.assertEqual(cfg["PORT"], 5432)
        self.assertEqual(cfg["CONN_MAX_AGE"], 600)  # Direct port 5432 uses persistent connections
        self.assertNotIn("disable_server_side_cursors", cfg["OPTIONS"])

    def test_bracketed_password_placeholder(self):
        # Users frequently copy from Supabase dashboard with literal [YOUR-PASSWORD]
        url = "postgresql://postgres.zmpthsiiouukjjyrbpnz:[SecretPass123]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres"
        cfg = parse_database_url(url)
        self.assertIsNotNone(cfg)
        self.assertEqual(cfg["PASSWORD"], "SecretPass123")  # Brackets stripped safely

    def test_special_characters_in_password(self):
        # Raw password containing @, #, $, %, &, +, /, =, ?
        url = "postgresql://postgres.zmpthsiiouukjjyrbpnz:p@ss#word$123%&+/=?@aws-0-ap-south-1.pooler.supabase.com:6543/postgres"
        cfg = parse_database_url(url)
        self.assertIsNotNone(cfg)
        self.assertEqual(cfg["PASSWORD"], "p@ss#word$123%&+/=?")
        self.assertEqual(cfg["HOST"], "aws-0-ap-south-1.pooler.supabase.com")
        self.assertEqual(cfg["PORT"], 6543)

    def test_pre_encoded_password(self):
        # URL where password is already percent-encoded (e.g. %40 for @)
        url = "postgresql://postgres.zmpthsiiouukjjyrbpnz:p%40ss%23word@aws-0-ap-south-1.pooler.supabase.com:6543/postgres"
        cfg = parse_database_url(url)
        self.assertIsNotNone(cfg)
        self.assertEqual(cfg["PASSWORD"], "p@ss#word")

    def test_sanitized_postgres_url_rfc3986(self):
        raw = "postgresql://postgres.zmpthsiiouukjjyrbpnz:p@ss#word$123@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require"
        sanitized = sanitize_postgres_url(raw)
        self.assertIn("p%40ss%23word%24123", sanitized)
        self.assertNotIn("p@ss#word", sanitized)

    def test_zero_credential_exposure_in_summary(self):
        url = "postgresql://postgres.zmpthsiiouukjjyrbpnz:SuperSecretPassword123!@aws-0-ap-south-1.pooler.supabase.com:6543/postgres"
        cfg = parse_database_url(url)
        summary = get_masked_db_summary(cfg)
        self.assertNotIn("SuperSecretPassword123!", summary)
        self.assertIn("postgresql", summary)
        self.assertIn("aws-0-ap-south-1.pooler.supabase.com:6543", summary)

if __name__ == "__main__":
    unittest.main()
