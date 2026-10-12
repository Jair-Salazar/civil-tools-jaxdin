"""Pruebas que NO necesitan base de datos:  pytest backend/tests  (desde la carpeta backend)."""
import os
os.environ.setdefault("SECRET_KEY", "x" * 40)
import pytest
from app.auth.security import hash_password, verify_password, create_token, decode_token
from app.schemas import validators as v
from app.schemas.resources import RESOURCES
from app.utils.errors import AppError


def test_password_hash_and_verify():
    h = hash_password("Secreta123")
    assert h != "Secreta123" and verify_password("Secreta123", h) and not verify_password("otra", h)


def test_token_roundtrip():
    data = decode_token(create_token(7, "ADMIN"))
    assert data["sub"] == "7" and data["role"] == "ADMIN"


def test_like_escapes_wildcards():
    assert v.like("50%_x") == "%50\\%\\_x%"


def test_slug_regex():
    assert v.SLUG_RE.match("viga-simple") and not v.SLUG_RE.match("Viga Simple")


def test_tool_definition_validation():
    v.validate_tool_definition({"inputs": [{"key": "b", "label": "Base"}], "outputs": [{"key": "A", "label": "Área", "expr": "b*b"}]}, "calculator")
    with pytest.raises(AppError):
        v.validate_tool_definition({"inputs": [{"key": "1x", "label": "Mal"}], "outputs": []}, "calculator")


def test_admin_resources_have_whitelisted_fields():
    for res, cfg in RESOURCES.items():
        names = [f["name"] for f in cfg["fields"]]
        assert all(f in names or f in ("id", "quantity") for f in cfg["filters"]), res
