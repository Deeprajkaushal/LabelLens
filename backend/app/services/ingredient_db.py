import json
import re
from typing import List, Dict, Any, Optional
from app.config import BASE_DIR
from app.models.schemas import IngredientExplanation

INGREDIENTS_FILE = BASE_DIR / "data" / "ingredients_db.json"

_DB_CACHE: Optional[List[Dict[str, Any]]] = None

def get_ingredients_db() -> List[Dict[str, Any]]:
    global _DB_CACHE
    if _DB_CACHE is None:
        if INGREDIENTS_FILE.exists():
            with open(INGREDIENTS_FILE, "r", encoding="utf-8") as f:
                _DB_CACHE = json.load(f)
        else:
            _DB_CACHE = []
    return _DB_CACHE

def find_ingredient_by_query(query: str) -> Optional[IngredientExplanation]:
    db = get_ingredients_db()
    q = query.strip().lower()
    if not q:
        return None

    # Exact or substring match on code (e.g. INS 500, E621)
    for item in db:
        code = (item.get("code") or "").lower()
        if q in code or (re.search(r"\d+", q) and re.search(r"\d+", q).group() in code):
            return _to_explanation(item)

    # Name match
    for item in db:
        if q in item["name"].lower():
            return _to_explanation(item)

    # Alt names match
    for item in db:
        for alt in item.get("alt_names", []):
            if q in alt.lower() or alt.lower() in q:
                return _to_explanation(item)

    return None

def search_ingredients(query: str, limit: int = 15) -> List[IngredientExplanation]:
    db = get_ingredients_db()
    q = query.strip().lower()
    results = []

    for item in db:
        match = False
        if not q:
            match = True
        elif q in item["name"].lower():
            match = True
        elif q in (item.get("code") or "").lower():
            match = True
        elif q in item.get("category", "").lower():
            match = True
        else:
            for alt in item.get("alt_names", []):
                if q in alt.lower():
                    match = True
                    break
        if match:
            results.append(_to_explanation(item))
            if len(results) >= limit:
                break

    return results

def extract_and_explain_ingredients(ingredients_text: str) -> List[IngredientExplanation]:
    """
    Parses a raw ingredients text string and matches against our curated local database.
    """
    if not ingredients_text:
        return []

    db = get_ingredients_db()
    found: List[IngredientExplanation] = []
    seen_ids = set()

    for item in db:
        # Check code in ingredients text
        code_patterns = []
        if item.get("code"):
            # Extract INS numbers like 500(ii) or 322 or 621
            ins_nums = re.findall(r"\d+\s*(?:\([a-z0-9ivx]+\))?", item["code"], re.IGNORECASE)
            for num in ins_nums:
                clean_num = num.replace(" ", "")
                code_patterns.append(rf"\b(?:ins|e)\s*{re.escape(clean_num)}\b")

        # Check name
        code_patterns.append(rf"\b{re.escape(item['name'])}\b")
        for alt in item.get("alt_names", []):
            if len(alt) > 3:
                code_patterns.append(rf"\b{re.escape(alt)}\b")

        for pat in code_patterns:
            if re.search(pat, ingredients_text, re.IGNORECASE):
                if item["id"] not in seen_ids:
                    found.append(_to_explanation(item))
                    seen_ids.add(item["id"])
                    break

    return found

def _to_explanation(item: Dict[str, Any]) -> IngredientExplanation:
    return IngredientExplanation(
        name=item["name"],
        code=item.get("code"),
        category=item.get("category", "Food Additive / Ingredient"),
        function=item.get("function", ""),
        explanation_en=item.get("explanation_en", ""),
        explanation_hi=item.get("explanation_hi", ""),
        caution=item.get("caution"),
        source=item.get("source")
    )
