"""Registro, inicio de sesión y datos de la sesión actual."""
import time
from collections import defaultdict
from flask import Blueprint, jsonify, request, g
from psycopg2.extras import Json
from config.settings import Settings
from ..auth.decorators import login_required
from ..auth.security import hash_password, verify_password, create_token
from ..db import fetch_one, execute
from ..schemas import validators as v
from ..utils.audit import log_action
from ..utils.errors import AppError

bp = Blueprint("auth", __name__, url_prefix="/api/auth")

# Protección básica contra fuerza bruta: 5 fallos / 15 min por (IP + correo). En memoria (1 proceso).
_failures = defaultdict(list)
WINDOW, MAX_FAILS = 15 * 60, 5


def _blocked(key):
    now = time.time()
    _failures[key] = [t for t in _failures[key] if now - t < WINDOW]
    return len(_failures[key]) >= MAX_FAILS


def _public(u):
    return {"id": u["id"], "email": u["email"], "full_name": u["full_name"], "role": u["role"], "preferences": u.get("preferences") or {}}


@bp.post("/login")
def login():
    data = v.json_body()
    mail = v.text(data, "email", "El correo", max_len=254).lower()
    pwd = data.get("password") if isinstance(data.get("password"), str) else ""
    key = f"{request.remote_addr}|{mail}"
    if _blocked(key):
        raise AppError("Demasiados intentos fallidos. Espera unos minutos e inténtalo de nuevo.", 429, "too_many_attempts")
    user = fetch_one("SELECT * FROM users WHERE lower(email) = %s", (mail,))
    # Mismo mensaje si el correo no existe o la contraseña falla: no revela qué cuentas existen.
    if not user or not user["is_active"] or not verify_password(pwd, user["password_hash"]):
        _failures[key].append(time.time())
        log_action("login_failed", "user", mail, user_id=user["id"] if user else None)
        raise AppError("Correo o contraseña incorrectos.", 401, "invalid_credentials")
    _failures.pop(key, None)
    execute("UPDATE users SET last_login_at = now() WHERE id = %s", (user["id"],))
    log_action("login", "user", user["id"], user_id=user["id"])
    return jsonify({"token": create_token(user["id"], user["role"]), "user": _public(user)})


@bp.post("/register")
def register():
    if not Settings.ALLOW_REGISTRATION:
        raise AppError("El registro de nuevas cuentas está desactivado.", 403, "registration_disabled")
    data = v.json_body()
    mail, pwd = v.email(data), v.password(data)
    name = v.text(data, "full_name", "El nombre", required=False, max_len=100)
    # Siempre se crea con rol USER. Un ADMIN solo se crea con create_admin.py o desde el panel.
    user = execute("INSERT INTO users (email, password_hash, full_name, role) VALUES (%s,%s,%s,'USER') RETURNING *",
                   (mail, hash_password(pwd), name))
    log_action("register", "user", user["id"], user_id=user["id"])
    return jsonify({"token": create_token(user["id"], user["role"]), "user": _public(user)}), 201


@bp.get("/me")
@login_required
def me():
    u = fetch_one("SELECT id, email, full_name, role, preferences FROM users WHERE id = %s", (g.user["id"],))
    return jsonify({"user": _public(u)})


@bp.put("/preferences")
@login_required
def save_preferences():
    data = v.json_body()
    prefs = data.get("preferences")
    if not isinstance(prefs, dict) or len(str(prefs)) > 5000:
        raise AppError("Preferencias inválidas.", 400, "validation")
    execute("UPDATE users SET preferences = %s WHERE id = %s", (Json(prefs), g.user["id"]))
    return jsonify({"ok": True})


@bp.put("/password")
@login_required
def change_password():
    data = v.json_body()
    user = fetch_one("SELECT password_hash FROM users WHERE id = %s", (g.user["id"],))
    if not verify_password(data.get("current") or "", user["password_hash"]):
        raise AppError("La contraseña actual no es correcta.", 400, "validation", {"current": "Incorrecta"})
    new = v.password(data, "new", "La nueva contraseña")
    execute("UPDATE users SET password_hash = %s WHERE id = %s", (hash_password(new), g.user["id"]))
    log_action("password_changed", "user", g.user["id"])
    return jsonify({"ok": True})
