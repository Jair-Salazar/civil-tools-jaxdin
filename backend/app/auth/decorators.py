"""
Autorización en el BACKEND. El frontend puede ocultar botones, pero la seguridad real es esta:
  @login_required   → exige token válido y usuaria activa
  @admin_required   → además exige rol ADMIN (se lee de la base de datos, no del token)
"""
from functools import wraps
import jwt
from flask import request, g
from ..db import fetch_one
from ..utils.errors import AppError
from .security import decode_token


def _load_user(required):
    header = request.headers.get("Authorization", "")
    if not header.startswith("Bearer "):
        if required:
            raise AppError("Debes iniciar sesión.", 401, "unauthorized")
        return None
    try:
        data = decode_token(header[7:])
        uid = int(data["sub"])
    except (jwt.InvalidTokenError, KeyError, ValueError):
        if required:
            raise AppError("Tu sesión expiró o no es válida. Inicia sesión de nuevo.", 401, "unauthorized")
        return None
    user = fetch_one("SELECT id, email, full_name, role, is_active FROM users WHERE id = %s", (uid,))
    if not user or not user["is_active"]:
        if required:
            raise AppError("Tu cuenta no está disponible.", 401, "unauthorized")
        return None
    return user


def login_required(fn):
    @wraps(fn)
    def wrapper(*a, **kw):
        g.user = _load_user(True)
        return fn(*a, **kw)
    return wrapper


def admin_required(fn):
    @wraps(fn)
    def wrapper(*a, **kw):
        g.user = _load_user(True)
        if g.user["role"] != "ADMIN":
            raise AppError("No tienes permisos para esta acción.", 403, "forbidden")
        return fn(*a, **kw)
    return wrapper


def optional_user(fn):
    """La ruta es pública, pero si hay sesión se usa (p. ej. el buscador incluye notas)."""
    @wraps(fn)
    def wrapper(*a, **kw):
        g.user = _load_user(False)
        return fn(*a, **kw)
    return wrapper
