import json
from typing import List, Optional
from fastapi import APIRouter, Query, Body
from app.models.schemas import IngredientExplanation
from app.services.ingredient_db import search_ingredients, find_ingredient_by_query
from app.services.optional_gemini import explain_unfamiliar_ingredient_ai
from app.config import BASE_DIR

router = APIRouter(prefix="/api/ingredients", tags=["Ingredients & Additives"])

@router.get("/search", response_model=List[IngredientExplanation])
def search_ingredients_endpoint(q: str = Query("", description="Query by ingredient name, INS code, E-number")):
    return search_ingredients(q)

@router.get("/common", response_model=List[IngredientExplanation])
def get_common_ingredients():
    return search_ingredients("", limit=25)

@router.post("/explain-ai")
def explain_ai_endpoint(
    ingredient_name: str = Body(..., embed=True),
    language: str = Body("en", embed=True)
):
    """
    Optional Gemini AI fallback for unfamiliar ingredients.
    Disabled by default; returns local message if not configured.
    """
    return explain_unfamiliar_ingredient_ai(ingredient_name, language)

@router.get("/demo-products")
def get_demo_products():
    """
    Returns the 3 curated demonstration products for Tech Expo offline demo.
    """
    demo_file = BASE_DIR / "data" / "demo_products.json"
    if demo_file.exists():
        with open(demo_file, "r", encoding="utf-8") as f:
            return json.load(f)
    return []
