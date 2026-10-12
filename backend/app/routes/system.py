"""Rutas públicas de estado: sirven al pie de página del frontend ("Estado del sistema")."""
from flask import Blueprint, jsonify
from config.settings import Settings
from ..db import ping, fetch_all

bp = Blueprint("system", __name__, url_prefix="/api")


@bp.get("/health")
def health():
    try:
        ping()
        return jsonify({"status": "ok", "database": True, "version": Settings.APP_VERSION})
    except Exception:
        return jsonify({"status": "degraded", "database": False, "version": Settings.APP_VERSION}), 503


@bp.get("/settings/public")
def public_settings():
    rows = fetch_all("SELECT key, value FROM site_settings WHERE key IN ('app_version','maintenance_message')")
    data = {r["key"]: r["value"] for r in rows}
    return jsonify({"app_version": data.get("app_version", Settings.APP_VERSION),
                    "maintenance_message": data.get("maintenance_message", ""),
                    "registration_enabled": Settings.ALLOW_REGISTRATION})
