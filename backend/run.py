"""Punto de entrada. Desarrollo:  python run.py   ·   Producción: gunicorn run:app"""
from app import create_app

app = create_app()

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=app.config["DEBUG"])
