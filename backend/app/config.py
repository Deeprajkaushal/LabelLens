import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

# Configurable SQLite database path
DATABASE_PATH = os.getenv("LABELLENS_DB_PATH", str(BASE_DIR.parent / "labellens.db"))

# CORS origins - default to Vite dev server ports
CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "LABELLENS_CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000"
    ).split(",")
    if origin.strip()
]

# Allow any Vercel preview or production deployment by default regex
CORS_ORIGIN_REGEX = os.getenv("LABELLENS_CORS_REGEX", r"^https:\/\/.*\.vercel\.app$")

# AI Fallback settings - Strictly disabled by default
ENABLE_GEMINI_FALLBACK = os.getenv("LABELLENS_ENABLE_GEMINI", "false").lower() in ("true", "1", "yes")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

# Server host and port (0.0.0.0 allows container & Render network binding)
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "8000"))
