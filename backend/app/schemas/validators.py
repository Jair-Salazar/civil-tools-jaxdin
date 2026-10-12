"""Validación de entradas del lado del servidor (nunca confiar en el frontend)."""
import re
from flask import request
from psycopg2.extras import Json
from ..utils.errors import AppError

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


def json_body():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        raise AppError("El cuerpo de la petición debe ser un JSON válido.", 400, "invalid_json")
    return data


def text(data, key, label, required=True, max_len=500, default=""):
    v = data.get(key, default)
    if v is None:
        v = default
    if not isinstance(v, str):
        raise AppError(f"{label} debe ser texto.", 400, "validation", {key: "Debe ser texto"})
    v = v.strip()
    if required and not v:
        raise AppError(f"{label} es obligatorio.", 400, "validation", {key: "Obligatorio"})
    if len(v) > max_len:
        raise AppError(f"{label} es demasiado largo (máximo {max_len} caracteres).", 400, "validation", {key: "Demasiado largo"})
    return v


def email(data, key="email"):
    v = text(data, key, "El correo", max_len=254).lower()
    if not EMAIL_RE.match(v):
        raise AppError("Ingresa un correo válido.", 400, "validation", {key: "Correo inválido"})
    return v


def password(data, key="password", label="La contraseña"):
    v = data.get(key)
    if not isinstance(v, str) or len(v) < 8:
        raise AppError(f"{label} debe tener al menos 8 caracteres.", 400, "validation", {key: "Mínimo 8 caracteres"})
    if len(v) > 128:
        raise AppError(f"{label} es demasiado larga.", 400, "validation", {key: "Máximo 128 caracteres"})
    return v


def positive_int(value, label="El identificador"):
    try:
        v = int(value)
        if v <= 0:
            raise ValueError
        return v
    except (TypeError, ValueError):
        raise AppError(f"{label} no es válido.", 400, "validation")


def page_params(default_limit=50, max_limit=200):
    try:
        limit = min(max(int(request.args.get("limit", default_limit)), 1), max_limit)
        page = max(int(request.args.get("page", 1)), 1)
    except ValueError:
        raise AppError("Parámetros de paginación inválidos.", 400, "validation")
    return limit, (page - 1) * limit


def like(term):
    """Prepara un término para ILIKE escapando % y _ que escribió el usuario."""
    t = (term or "").strip()[:100].replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    return f"%{t}%"


def validate_tool_definition(d, kind):
    """Revisa que el JSON 'definition' de una herramienta tenga la forma que espera el frontend."""
    if kind != "calculator":
        return
    if not isinstance(d, dict) or not isinstance(d.get("inputs"), list) or not isinstance(d.get("outputs"), list):
        raise AppError("La definición debe tener 'inputs' y 'outputs' (listas).", 400, "validation", {"definition": "Formato inválido"})
    if not d["outputs"]:
        raise AppError("La definición necesita al menos un resultado en 'outputs'.", 400, "validation", {"definition": "Sin outputs"})
    for i in d["inputs"]:
        if not isinstance(i, dict) or not re.match(r"^[A-Za-z_][A-Za-z0-9_]*$", str(i.get("key", ""))) or not i.get("label"):
            raise AppError("Cada input necesita 'key' (identificador válido) y 'label'.", 400, "validation", {"definition": "Input inválido"})
    for o in d["outputs"]:
        if not isinstance(o, dict) or not o.get("key") or not o.get("label") or not o.get("expr"):
            raise AppError("Cada output necesita 'key', 'label' y 'expr'.", 400, "validation", {"definition": "Output inválido"})
