import re
from typing import List, Tuple, Dict, Any
from app.models.schemas import AllergenMatch

# Major allergens dictionary with keyword regex patterns
ALLERGEN_PATTERNS = {
    "Milk / Dairy": [
        r"\b(?:milk|dairy|whey|casein|caseinate|butter|cream|paneer|curd|yogurt|ghee|cheese|lactose)\b"
    ],
    "Peanuts": [
        r"\b(?:peanut|peanuts|groundnut|groundnuts|arachis\s*oil)\b"
    ],
    "Tree Nuts": [
        r"\b(?:tree\s*nuts?|almond|almonds|badam|cashew|cashews|kaju|walnut|walnuts|akhrot|pistachio|pistachios|pista|hazelnut|hazelnuts|pecan|pecans|macadamia)\b"
    ],
    "Soy / Soya": [
        r"\b(?:soy|soya|soybean|soybeans|soy\s*lecithin|soya\s*lecithin|soya\s*protein|edamame)\b"
    ],
    "Wheat / Gluten": [
        r"\b(?:wheat|maida|atta|gluten|semolina|suji|sooji|barley|rye|oats?|spelt)\b"
    ],
    "Egg": [
        r"\b(?:egg|eggs|egg\s*yolk|egg\s*white|albumen|ovalbumin)\b"
    ],
    "Fish": [
        r"\b(?:fish|salmon|tuna|cod|anchovy|anchovies|tilapia|sardine|mackerel)\b"
    ],
    "Crustaceans / Shellfish": [
        r"\b(?:crustaceans?|shellfish|shrimp|shrimps|prawn|prawns|crab|crabs|lobster|lobsters)\b"
    ],
    "Sesame": [
        r"\b(?:sesame|sesame\s*seeds?|til|tahini)\b"
    ],
    "Mustard": [
        r"\b(?:mustard|mustard\s*oil|mustard\s*seeds?|rai|sarson)\b"
    ],
    "Sulphites": [
        r"\b(?:sulphite|sulfite|sulphur\s*dioxide|sulfur\s*dioxide|ins\s*22[0-8])\b"
    ]
}

def detect_allergens_in_text(
    ingredients_text: str,
    allergen_statement: str = ""
) -> List[AllergenMatch]:
    """
    Scans ingredients list and allergen advice statement for known allergens.
    Extracts verbatim evidence snippets and categorizes confidence.
    """
    detected: List[AllergenMatch] = []
    seen_allergens = set()

    combined_text = f"{ingredients_text}\n{allergen_statement}"
    
    # Check for precautionary phrasing
    is_precautionary_context = bool(
        re.search(r"\b(?:may\s*contain|made\s*on\s*equipment|facility\s*that\s*processes|traces?\s*of)\b", combined_text, re.IGNORECASE)
    )

    # 1. Search in allergen statement first (higher specificity)
    if allergen_statement:
        for allergen, patterns in ALLERGEN_PATTERNS.items():
            for pattern in patterns:
                match = re.search(pattern, allergen_statement, re.IGNORECASE)
                if match and allergen not in seen_allergens:
                    # Extract surrounding snippet
                    start = max(0, match.start() - 25)
                    end = min(len(allergen_statement), match.end() + 25)
                    snippet = allergen_statement[start:end].strip()
                    confidence = "Precautionary / Cross-contact" if ("may contain" in snippet.lower() or "traces" in snippet.lower()) else "Declared Warning"

                    detected.append(
                        AllergenMatch(
                            allergen=allergen,
                            evidence_snippet=snippet,
                            confidence=confidence
                        )
                    )
                    seen_allergens.add(allergen)
                    break

    # 2. Search in ingredients text
    if ingredients_text:
        for allergen, patterns in ALLERGEN_PATTERNS.items():
            if allergen in seen_allergens:
                continue
            for pattern in patterns:
                match = re.search(pattern, ingredients_text, re.IGNORECASE)
                if match:
                    start = max(0, match.start() - 20)
                    end = min(len(ingredients_text), match.end() + 20)
                    snippet = ingredients_text[start:end].strip()

                    detected.append(
                        AllergenMatch(
                            allergen=allergen,
                            evidence_snippet=snippet,
                            confidence="Declared Ingredient"
                        )
                    )
                    seen_allergens.add(allergen)
                    break

    return detected
