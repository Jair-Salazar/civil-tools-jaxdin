"""Errores controlados: la API siempre responde {"error": {"code", "message"}} en español."""
import logging
from flask import jsonify
from psycopg2 import errors as pg_errors
from psycopg2 import Error as PgError

log = logging.getLogger("civiltools")


class AppError(Exception):
    def __init__(self, message, status=400, code="bad_request", fields=None):
        super().__init__(message)
        self.message, self.status, self.code, self.fields = message, status, code, fields


def _resp(message, status, code, fields=None):
    body = {"error": {"code": code, "message": message}}
    if fields:
        body["error"]["fields"] = fields
    return jsonify(body), status


def register_error_handlers(app):
    @app.errorhandler(AppError)
    def _app_error(e):
        return _resp(e.message, e.status, e.code, e.fields)

    @app.errorhandler(404)
    def _404(e):
        return _resp("Recurso no encontrado.", 404, "not_found")

    @app.errorhandler(405)
    def _405(e):
        return _resp("Método no permitido.", 405, "method_not_allowed")

    @app.errorhandler(pg_errors.UniqueViolation)
    def _unique(e):
        return _resp("Ya existe un registro con ese valor único (por ejemplo, el slug o el correo).", 409, "duplicate")

    @app.errorhandler(pg_errors.ForeignKeyViolation)
    def _fk(e):
        return _resp("No se puede completar: el registro está relacionado con otros datos.", 409, "related")

    @app.errorhandler(PgError)
    def _pg(e):
        log.exception("Error de base de datos")
        return _resp("Error al acceder a la base de datos.", 500, "db_error")

    @app.errorhandler(Exception)
    def _unknown(e):
        log.exception("Error no controlado")
        return _resp("Ocurrió un error inesperado en el servidor.", 500, "server_error")
