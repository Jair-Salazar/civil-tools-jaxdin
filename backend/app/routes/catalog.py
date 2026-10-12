"""Contenido público: categorías, herramientas, fórmulas, unidades y materiales (solo lectura)."""
from flask import Blueprint, jsonify, request
from ..db import fetch_all, fetch_one
from ..schemas.validators import like
from ..utils.errors import AppError

bp = Blueprint("catalog", __name__, url_prefix="/api")

TOOL_SELECT = """
    SELECT t.id, t.slug, t.name, t.description, t.kind, t.definition, t.educational_only,
           c.slug AS category_slug, c.name AS category_name
    FROM tools t JOIN categories c ON c.id = t.category_id
"""
FORMULA_SELECT = """
    SELECT f.id, f.slug, f.name, f.expression, f.description, f.explanation, f.example, f.is_featured,
           c.slug AS category_slug, c.name AS category_name,
           t.id AS tool_id, t.slug AS tool_slug, tc.slug AS tool_category_slug, t.name AS tool_name
    FROM formulas f
    JOIN categories c ON c.id = f.category_id
    LEFT JOIN tools t ON t.id = f.tool_id AND t.is_active
    LEFT JOIN categories tc ON tc.id = t.category_id
"""


@bp.get("/categories")
def categories():
    rows = fetch_all("""
        SELECT c.id, c.slug, c.name, c.description, c.icon, c.sort_order,
               (SELECT count(*) FROM tools t WHERE t.category_id = c.id AND t.is_active) AS tool_count,
               (SELECT count(*) FROM formulas f WHERE f.category_id = c.id AND f.is_active) AS formula_count
        FROM categories c WHERE c.is_active ORDER BY c.sort_order, c.id""")
    return jsonify(rows)


@bp.get("/tools")
def tools():
    where, params = ["t.is_active", "c.is_active"], []
    if request.args.get("category"):
        where.append("c.slug = %s"); params.append(request.args["category"])
    if request.args.get("q"):
        where.append("(t.name ILIKE %s OR t.description ILIKE %s)"); params += [like(request.args["q"])] * 2
    return jsonify(fetch_all(f"{TOOL_SELECT} WHERE {' AND '.join(where)} ORDER BY c.sort_order, t.sort_order, t.id", params))


@bp.get("/tools/<int:tool_id>")
def tool_detail(tool_id):
    row = fetch_one(f"{TOOL_SELECT} WHERE t.id = %s AND t.is_active", (tool_id,))
    if not row:
        raise AppError("Herramienta no encontrada.", 404, "not_found")
    return jsonify(row)


@bp.get("/formulas")
def formulas():
    where, params = ["f.is_active"], []
    a = request.args
    if a.get("category"):
        where.append("c.slug = %s"); params.append(a["category"])
    if a.get("tool_id"):
        where.append("f.tool_id = %s"); params.append(int(a["tool_id"]) if a["tool_id"].isdigit() else 0)
    if a.get("featured") == "1":
        where.append("f.is_featured")
    if a.get("q"):
        where.append("(f.name ILIKE %s OR f.expression ILIKE %s OR f.description ILIKE %s)"); params += [like(a["q"])] * 3
    return jsonify(fetch_all(f"{FORMULA_SELECT} WHERE {' AND '.join(where)} ORDER BY f.sort_order, f.id", params))


@bp.get("/formulas/<int:fid>")
def formula_detail(fid):
    row = fetch_one(f"{FORMULA_SELECT} WHERE f.id = %s AND f.is_active", (fid,))
    if not row:
        raise AppError("Fórmula no encontrada.", 404, "not_found")
    row["variables"] = fetch_all(
        "SELECT symbol, name, unit, description FROM formula_variables WHERE formula_id = %s ORDER BY sort_order, id", (fid,))
    return jsonify(row)


@bp.get("/units")
def units():
    return jsonify(fetch_all(
        "SELECT id, quantity, quantity_label, symbol, name, factor, offset_value, is_base FROM units ORDER BY quantity_label, sort_order, id"))


@bp.get("/materials")
def materials():
    where, params = ["is_active"], []
    if request.args.get("category"):
        where.append("category = %s"); params.append(request.args["category"])
    if request.args.get("q"):
        where.append("(name ILIKE %s OR description ILIKE %s OR category ILIKE %s)"); params += [like(request.args["q"])] * 3
    return jsonify(fetch_all(
        f"SELECT id, slug, name, category, description, properties, notes FROM materials WHERE {' AND '.join(where)} ORDER BY category, name", params))


@bp.get("/materials/<int:mid>")
def material_detail(mid):
    row = fetch_one("SELECT id, slug, name, category, description, properties, notes FROM materials WHERE id = %s AND is_active", (mid,))
    if not row:
        raise AppError("Material no encontrado.", 404, "not_found")
    return jsonify(row)
