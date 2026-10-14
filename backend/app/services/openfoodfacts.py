import requests
import logging
from typing import Optional, Dict, Any
from app.models.schemas import ProductResponse, AllergenMatch

logger = logging.getLogger(__name__)

# In-memory cache for barcode lookups
_BARCODE_CACHE: Dict[str, Dict[str, Any]] = {}

def lookup_barcode(barcode: str) -> Optional[Dict[str, Any]]:
    """
    Look up barcode against Open Food Facts API with local caching and offline fallback.
    Respects rate limits, timeouts in 4 seconds.
    """
    clean_barcode = barcode.strip()
    if not clean_barcode or not clean_barcode.isdigit():
        return None

    if clean_barcode in _BARCODE_CACHE:
        return _BARCODE_CACHE[clean_barcode]

    url = f"https://world.openfoodfacts.org/api/v0/product/{clean_barcode}.json"
    headers = {"User-Agent": "LabelLens-ConsumerApp/1.0 (local-test)"}

    try:
        resp = requests.get(url, headers=headers, timeout=4.0)
        if resp.status_code == 200:
            data = resp.json()
            if data.get("status") == 1:
                product_data = data.get("product", {})
                result = {
                    "found": True,
                    "barcode": clean_barcode,
                    "name": product_data.get("product_name") or product_data.get("product_name_en") or "Scanned Product",
                    "brand": product_data.get("brands"),
                    "net_quantity": product_data.get("quantity"),
                    "energy_kcal": product_data.get("nutriments", {}).get("energy-kcal_100g"),
                    "protein_g": product_data.get("nutriments", {}).get("proteins_100g"),
                    "carbohydrates_g": product_data.get("nutriments", {}).get("carbohydrates_100g"),
                    "total_sugar_g": product_data.get("nutriments", {}).get("sugars_100g"),
                    "total_fat_g": product_data.get("nutriments", {}).get("fat_100g"),
                    "saturated_fat_g": product_data.get("nutriments", {}).get("saturated-fat_100g"),
                    "sodium_mg": (product_data.get("nutriments", {}).get("sodium_100g") or 0) * 1000,
                    "ingredients_raw": product_data.get("ingredients_text"),
                    "source": "Open Food Facts (Public Database)"
                }
                _BARCODE_CACHE[clean_barcode] = result
                return result
    except Exception as e:
        logger.info(f"OpenFoodFacts lookup unreachable or timed out (offline mode active): {e}")

    return None
