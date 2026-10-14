from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

# --- Evidence & Provenance ---
class FieldEvidence(BaseModel):
    field_name: str
    value: Any = None
    source: str = "Missing / Unknown"  # "Read from Package", "Calculated", "User Verified", "Reference DB", "Missing / Unknown"
    raw_snippet: Optional[str] = None
    confidence: str = "Uncertain"  # "High", "Medium", "Uncertain", "Missing"
    notes: Optional[str] = None

class AllergenMatch(BaseModel):
    allergen: str
    evidence_snippet: str
    confidence: str = "Declared Ingredient"  # "Declared Ingredient", "Precautionary / Cross-contact", "Suspected Match"

class IngredientExplanation(BaseModel):
    name: str
    code: Optional[str] = None
    category: str
    function: str
    explanation_en: str
    explanation_hi: str
    caution: Optional[str] = None
    source: Optional[str] = None

class DeclarationCheckItem(BaseModel):
    field_name: str
    label_text: str
    is_present: bool
    detected_value: Optional[str] = None
    rule_description: str
    status: str  # "Declared", "Potentially Missing", "Non-standard format"
    guidance: str

# --- Product Models ---
class ProductBase(BaseModel):
    name: str
    brand: Optional[str] = None
    category: Optional[str] = None
    net_quantity_value: Optional[float] = None
    net_quantity_unit: Optional[str] = None
    mrp: Optional[float] = None
    currency: str = "INR"
    price_per_standard_unit: Optional[float] = None
    standard_unit: Optional[str] = None
    serving_size: Optional[float] = None
    serving_unit: Optional[str] = None
    servings_per_container: Optional[float] = None
    nutrition_basis: str = "per 100g"  # "per 100g", "per 100ml", "per serving"
    energy_kcal: Optional[float] = None
    protein_g: Optional[float] = None
    carbohydrates_g: Optional[float] = None
    total_sugar_g: Optional[float] = None
    added_sugar_g: Optional[float] = None
    total_fat_g: Optional[float] = None
    saturated_fat_g: Optional[float] = None
    trans_fat_g: Optional[float] = None
    cholesterol_mg: Optional[float] = None
    fibre_g: Optional[float] = None
    sodium_mg: Optional[float] = None
    ingredients_raw: Optional[str] = None
    allergen_statement: Optional[str] = None
    mfg_date: Optional[str] = None
    expiry_date: Optional[str] = None
    best_before_text: Optional[str] = None
    manufacturer_name: Optional[str] = None
    manufacturer_address: Optional[str] = None
    country_of_origin: Optional[str] = None
    consumer_care_details: Optional[str] = None
    raw_ocr_text: Optional[str] = None
    data_source: str = "Manual / OCR"
    is_favorite: bool = False
    is_demo: bool = False

class ProductCreate(ProductBase):
    id: Optional[str] = None
    allergens_detected: List[AllergenMatch] = []

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    brand: Optional[str] = None
    category: Optional[str] = None
    net_quantity_value: Optional[float] = None
    net_quantity_unit: Optional[str] = None
    mrp: Optional[float] = None
    currency: Optional[str] = None
    price_per_standard_unit: Optional[float] = None
    standard_unit: Optional[str] = None
    serving_size: Optional[float] = None
    serving_unit: Optional[str] = None
    servings_per_container: Optional[float] = None
    nutrition_basis: Optional[str] = None
    energy_kcal: Optional[float] = None
    protein_g: Optional[float] = None
    carbohydrates_g: Optional[float] = None
    total_sugar_g: Optional[float] = None
    added_sugar_g: Optional[float] = None
    total_fat_g: Optional[float] = None
    saturated_fat_g: Optional[float] = None
    trans_fat_g: Optional[float] = None
    cholesterol_mg: Optional[float] = None
    fibre_g: Optional[float] = None
    sodium_mg: Optional[float] = None
    ingredients_raw: Optional[str] = None
    allergens_detected: Optional[List[AllergenMatch]] = None
    allergen_statement: Optional[str] = None
    mfg_date: Optional[str] = None
    expiry_date: Optional[str] = None
    best_before_text: Optional[str] = None
    manufacturer_name: Optional[str] = None
    manufacturer_address: Optional[str] = None
    country_of_origin: Optional[str] = None
    consumer_care_details: Optional[str] = None
    raw_ocr_text: Optional[str] = None
    is_favorite: Optional[bool] = None

class ProductResponse(ProductBase):
    id: str
    allergens_detected: List[AllergenMatch] = []
    field_evidences: Optional[List[FieldEvidence]] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

# --- OCR & Text Analysis ---
class AnalyzeLabelRequest(BaseModel):
    raw_text: str
    image_names: Optional[List[str]] = None
    language: str = "en"
    use_ai_fallback: bool = False

class AnalyzeLabelResponse(BaseModel):
    product: ProductResponse
    evidences: List[FieldEvidence]
    allergens_detected: List[AllergenMatch]
    ingredients_explained: List[IngredientExplanation]
    declarations_checklist: List[DeclarationCheckItem]
    raw_ocr_text: str
    overall_confidence: str
    warnings: List[str] = []

# --- Portion & Calorie Calculator ---
class PortionCalculateRequest(BaseModel):
    energy_kcal_basis: float
    basis: str = "per 100g"  # "per 100g" or "per 100ml" or "per serving"
    basis_quantity: float = 100.0  # 100 or declared serving size
    portion_size: float
    portion_unit: str = "g"
    protein_g: Optional[float] = None
    carbohydrates_g: Optional[float] = None
    total_sugar_g: Optional[float] = None
    total_fat_g: Optional[float] = None
    saturated_fat_g: Optional[float] = None
    sodium_mg: Optional[float] = None
    fibre_g: Optional[float] = None

class CalculatedNutrient(BaseModel):
    nutrient_name: str
    basis_value: Optional[float] = None
    portion_value: Optional[float] = None
    unit: str

class PortionCalculateResponse(BaseModel):
    portion_size: float
    portion_unit: str
    energy_kcal: float
    formula_used: str
    nutrients: List[CalculatedNutrient]
    is_compatible: bool = True
    notice: Optional[str] = None

# --- Comparison ---
class CompareProductsRequest(BaseModel):
    product_a_id: Optional[str] = None
    product_b_id: Optional[str] = None
    product_a: Optional[ProductBase] = None
    product_b: Optional[ProductBase] = None

class ComparisonRow(BaseModel):
    metric: str
    unit: str
    val_a: Optional[float] = None
    val_b: Optional[float] = None
    val_a_display: str
    val_b_display: str
    diff_display: Optional[str] = None
    favorable_indicator: Optional[str] = None  # "a", "b", "equal", "neutral"
    note: Optional[str] = None

class ProductCompareResponse(BaseModel):
    product_a_name: str
    product_b_name: str
    normalized_basis: str
    are_units_compatible: bool
    incompatibility_reason: Optional[str] = None
    nutrition_rows: List[ComparisonRow]
    value_rows: List[ComparisonRow]
    key_takeaways: List[str]
    allergens_comparison: Dict[str, Any]

# --- Food Log ---
class FoodLogCreate(BaseModel):
    product_id: Optional[str] = None
    product_name: str
    log_date: str  # YYYY-MM-DD
    meal_type: str = "Snack"  # Breakfast, Lunch, Dinner, Snack
    portion_size: float
    portion_unit: str
    calories_consumed: float
    protein_g: Optional[float] = None
    carbs_g: Optional[float] = None
    fat_g: Optional[float] = None
    sugar_g: Optional[float] = None
    sodium_mg: Optional[float] = None
    notes: Optional[str] = None

class FoodLogUpdate(BaseModel):
    portion_size: Optional[float] = None
    portion_unit: Optional[str] = None
    calories_consumed: Optional[float] = None
    meal_type: Optional[str] = None
    notes: Optional[str] = None

class FoodLogResponse(BaseModel):
    id: str
    product_id: Optional[str] = None
    product_name: str
    log_date: str
    meal_type: str
    portion_size: float
    portion_unit: str
    calories_consumed: float
    protein_g: Optional[float] = None
    carbs_g: Optional[float] = None
    fat_g: Optional[float] = None
    sugar_g: Optional[float] = None
    sodium_mg: Optional[float] = None
    notes: Optional[str] = None
    created_at: str

class DailyFoodLogSummary(BaseModel):
    log_date: str
    total_calories: float
    total_protein_g: float
    total_carbs_g: float
    total_fat_g: float
    total_sugar_g: float
    total_sodium_mg: float
    entries_count: int
    entries: List[FoodLogResponse]

# --- Reminders ---
class ReminderCreate(BaseModel):
    product_id: Optional[str] = None
    product_name: str
    reminder_date: str  # YYYY-MM-DD
    expiry_date: str    # YYYY-MM-DD
    reminder_type: str = "Expiry"  # "Expiry" or "Best Before"
    notes: Optional[str] = None

class ReminderUpdate(BaseModel):
    reminder_date: Optional[str] = None
    expiry_date: Optional[str] = None
    status: Optional[str] = None  # "Active", "Dismissed"
    notes: Optional[str] = None

class ReminderResponse(BaseModel):
    id: str
    product_id: Optional[str] = None
    product_name: str
    reminder_date: str
    expiry_date: str
    reminder_type: str
    status: str
    days_left: int
    notes: Optional[str] = None
    created_at: str
