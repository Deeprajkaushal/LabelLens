import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import CORS_ORIGINS, CORS_ORIGIN_REGEX, ENABLE_GEMINI_FALLBACK
from app.db import init_db
from app.routers import label, products, compare, food_log, reminders, ingredients

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize SQLite database schema and seed demo products
    init_db()
    # Warm up OCR engine in background to prevent first-run 90-second latency
    try:
        from app.services.ocr_engine import get_ocr_engine
        get_ocr_engine()
    except Exception as e:
        pass
    yield

app = FastAPI(
    title="LabelLens API",
    description="Local-First, AI-Light Consumer Product Intelligence Platform API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS middleware configuration with Vercel origin regex support
is_wildcard = "*" in CORS_ORIGINS
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS if CORS_ORIGINS else ["*"],
    allow_origin_regex=CORS_ORIGIN_REGEX if (CORS_ORIGIN_REGEX and not is_wildcard) else None,
    allow_credentials=not is_wildcard,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(label.router)
app.include_router(products.router)
app.include_router(compare.router)
app.include_router(food_log.router)
app.include_router(reminders.router)
app.include_router(ingredients.router)

@app.get("/health", tags=["Health"])
def health_check():
    """
    Health check endpoint returning system status and configuration state.
    """
    return {
        "status": "healthy",
        "app": "LabelLens",
        "version": "1.0.0",
        "mode": "Local-First / Deterministic",
        "ai_fallback_enabled": ENABLE_GEMINI_FALLBACK,
        "database": "SQLite (Active)"
    }

@app.get("/", tags=["Root"])
def root():
    return {
        "message": "Welcome to LabelLens API. Visit /docs for interactive documentation.",
        "tagline": "Scan. Understand. Compare."
    }
