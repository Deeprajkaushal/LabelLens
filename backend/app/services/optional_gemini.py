import logging
from typing import Dict, Any, Optional
from app.config import ENABLE_GEMINI_FALLBACK, GEMINI_API_KEY

logger = logging.getLogger(__name__)

def is_ai_available() -> bool:
    return bool(ENABLE_GEMINI_FALLBACK and GEMINI_API_KEY.strip())

def explain_unfamiliar_ingredient_ai(ingredient_name: str, language: str = "en") -> Dict[str, Any]:
    """
    Optional AI explanation fallback for uncommon ingredients.
    Disabled by default. Gracefully falls back to local message if not configured.
    """
    if not is_ai_available():
        return {
            "name": ingredient_name,
            "explanation_en": "Explanation not available yet in local database.",
            "explanation_hi": "स्थानीय डेटाबेस में इस सामग्री का विवरण अभी उपलब्ध नहीं है।",
            "source": "Local Fallback (AI disabled)",
            "ai_used": False
        }

    try:
        from google import genai
        client = genai.Client(api_key=GEMINI_API_KEY)
        prompt = (
            f"Provide a plain-language consumer explanation for food ingredient/additive '{ingredient_name}'. "
            "Return brief functional purpose in English and Hindi. Do NOT make medical or toxicity claims."
        )
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
        )
        text = response.text or ""
        return {
            "name": ingredient_name,
            "explanation_en": text.strip()[:300],
            "explanation_hi": "एआई द्वारा जनरेट किया गया संक्षिप्त विवरण।",
            "source": "Optional Gemini AI",
            "ai_used": True
        }
    except Exception as e:
        logger.warning(f"Optional Gemini request failed or not reachable: {e}")
        return {
            "name": ingredient_name,
            "explanation_en": "Explanation not available yet in local database.",
            "explanation_hi": "स्थानीय डेटाबेस में इस सामग्री का विवरण अभी उपलब्ध नहीं है।",
            "source": "Local Fallback (Network / Quota error)",
            "ai_used": False
        }
