"""Configuration and CORS regression tests; no external services are contacted."""

import importlib
import os
import secrets
import unittest
from unittest.mock import patch


class DeploymentConfigTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Isolated test settings, unrelated to provider credentials.
        cls.environment = patch.dict(os.environ, {
            "DATABASE_URL": "postgresql://localhost/deployment_config_test",
            "SECRET_KEY": secrets.token_urlsafe(48),
            "MAIL_USERNAME": "",
            "MAIL_PASSWORD": "",
            "MAIL_FROM": "test@example.com",
            "MAIL_SERVER": "localhost",
            "CLOUDINARY_API_KEY": "",
            "CLOUDINARY_API_SECRET": "",
            "CORS_ORIGINS": '["https://frontend.example.com"]',
        })
        cls.environment.start()
        cls.addClassCleanup(cls.environment.stop)
        cls.config = importlib.import_module("app.core.config")

    def test_render_legacy_postgres_scheme_is_normalized(self):
        settings = self.config.Settings(DATABASE_URL="postgres://localhost/test")
        self.assertEqual(settings.DATABASE_URL, "postgresql://localhost/test")

    def test_sqlalchemy_postgres_url_is_preserved(self):
        url = "postgresql+psycopg2://localhost/test?sslmode=require"
        self.assertEqual(self.config.Settings(DATABASE_URL=url).DATABASE_URL, url)

    def test_cors_origins_are_loaded_from_json(self):
        self.assertEqual(self.config.Settings().CORS_ORIGINS, ["https://frontend.example.com"])

    def test_allowed_frontend_origin_receives_cors_headers(self):
        from fastapi.testclient import TestClient
        from app.main import app

        with TestClient(app) as client:
            response = client.options("/api/auth/login", headers={
                "Origin": "https://frontend.example.com",
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "content-type",
            })
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers["access-control-allow-origin"], "https://frontend.example.com")
        self.assertEqual(response.headers["access-control-allow-credentials"], "true")

    def test_unconfigured_origin_is_rejected(self):
        from fastapi.testclient import TestClient
        from app.main import app

        with TestClient(app) as client:
            response = client.options("/api/auth/login", headers={
                "Origin": "https://untrusted.example.com",
                "Access-Control-Request-Method": "POST",
            })
        self.assertEqual(response.status_code, 400)
        self.assertNotIn("access-control-allow-origin", response.headers)


if __name__ == "__main__":
    unittest.main()
