"""Registro de acciones importantes (tabla audit_logs) para el panel de administración."""
from flask import request, g
from psycopg2.extras import Json
from ..db import execute


def log_action(action, entity="", entity_id="", detail=None, user_id=None):
    uid = user_id if user_id is not None else (g.user["id"] if getattr(g, "user", None) else None)
    try:
        execute("INSERT INTO audit_logs (user_id, action, entity, entity_id, detail, ip) VALUES (%s,%s,%s,%s,%s,%s)",
                (uid, action, entity, str(entity_id), Json(detail or {}), request.remote_addr or ""))
    except Exception:  # un fallo de log nunca debe romper la petición
        pass
