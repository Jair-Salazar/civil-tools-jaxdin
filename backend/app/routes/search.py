"""Buscador global: herramientas, fórmulas, materiales, categorías y (si hay sesión) notas."""
from flask import Blueprint, jsonify, request, g
from ..auth.decorators import optional_user
from ..db import fetch_all
from ..schemas.validators import like

bp = Blueprint("search", __name__, url_prefix="/api")


@bp.get("/search")
@optional_user
def search():
    q = (request.args.get("q") or "").strip()
    if len(q) < 2:
        return jsonify({"query": q, "tools": [], "formulas": [], "materials": [], "categories": [], "notes": []})
    p = like(q)
    result = {"query": q}
    result["tools"] = fetch_all("""SELECT t.id, t.slug, t.name, t.description, c.slug AS category_slug, c.name AS category_name
        FROM tools t JOIN categories c ON c.id=t.category_id
        WHERE t.is_active AND c.is_active AND (t.name ILIKE %s OR t.description ILIKE %s) ORDER BY t.name LIMIT 8""", (p, p))
    result["formulas"] = fetch_all("""SELECT id, name, expression, description FROM formulas
        WHERE is_active AND (name ILIKE %s OR expression ILIKE %s OR description ILIKE %s) ORDER BY name LIMIT 8""", (p, p, p))
    result["materials"] = fetch_all("""SELECT id, name, category, description FROM materials
        WHERE is_active AND (name ILIKE %s OR description ILIKE %s OR category ILIKE %s) ORDER BY name LIMIT 8""", (p, p, p))
    result["categories"] = fetch_all("""SELECT slug, name, description FROM categories
        WHERE is_active AND (name ILIKE %s OR description ILIKE %s) ORDER BY sort_order LIMIT 8""", (p, p))
    result["notes"] = fetch_all("""SELECT id, title, category FROM notes WHERE user_id=%s AND (title ILIKE %s OR content ILIKE %s)
        ORDER BY updated_at DESC LIMIT 8""", (g.user["id"], p, p)) if g.user else []
    return jsonify(result)
