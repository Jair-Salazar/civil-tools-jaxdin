"""Configuración central. TODO lo sensible viene de variables de entorno (archivo .env)."""
import os
from pathlib import Path
from dotenv import load_dotenv

# Carga backend/.env (y, si no existe, ../.env en la raíz del proyecto)
_here = Path(__file__).resolve().parent.parent
load_dotenv(_here / ".env")
load_dotenv(_here.parent / ".env")


def _bool(name, default=False):
    return os.getenv(name, str(default)).strip().lower() in ("1", "true", "yes", "si", "sí")


class Settings:
    ENV = os.getenv("APP_ENV", "development")
    DEBUG = ENV == "development"
    SECRET_KEY = os.getenv("SECRET_KEY", "")
    DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/civil_tools")
    JWT_EXPIRES_HOURS = int(os.getenv("JWT_EXPIRES_HOURS", "12"))
    # Orígenes permitidos por CORS, separados por coma. Ej: https://tuusuario.github.io
    CORS_ORIGINS = [o.strip() for o in os.getenv(
        "CORS_ORIGINS", "http://localhost:5500,http://127.0.0.1:5500,http://localhost:8080").split(",") if o.strip()]
    ALLOW_REGISTRATION = _bool("ALLOW_REGISTRATION", True)
    APP_VERSION = "1.0.0"

    @classmethod
    def validate(cls):
        if len(cls.SECRET_KEY) < 32:
            raise RuntimeError(
                "SECRET_KEY no está definida o es muy corta (mínimo 32 caracteres). "
                "Genera una con:  python -c \"import secrets; print(secrets.token_hex(32))\"  y ponla en backend/.env")
