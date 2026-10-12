"""Fábrica de la aplicación Flask: crea la app, configura CORS, base de datos, rutas y errores."""
from flask import Flask
from flask_cors import CORS

from config.settings import Settings
from .db import init_pool
from .utils.errors import register_error_handlers


def create_app():
    Settings.validate()
    app = Flask(__name__)
    app.config.from_object(Settings)
    app.json.ensure_ascii = False          # tildes legibles en las respuestas JSON
    app.json.sort_keys = False

    # CORS: solo los orígenes de la lista blanca pueden llamar a la API desde un navegador.
    CORS(app, origins=Settings.CORS_ORIGINS, allow_headers=["Content-Type", "Authorization"],
         methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"], max_age=600)

    init_pool(Settings.DATABASE_URL)

    from .routes import auth, catalog, user, search, admin, system
    for module in (system, auth, catalog, user, search, admin):
        app.register_blueprint(module.bp)

    register_error_handlers(app)

    @app.after_request
    def security_headers(resp):
        resp.headers["X-Content-Type-Options"] = "nosniff"
        resp.headers["Cache-Control"] = "no-store"
        return resp

    return app
