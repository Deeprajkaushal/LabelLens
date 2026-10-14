export interface FieldEvidence {
  field_name: string;
  value: any;
  source: string; // "Read from Package", "Calculated", "User Verified", "Reference DB", "Missing / Unknown"
  raw_snippet?: string;
  confidence: string; // "High", "Medium", "Uncertain", "Missing"
  notes?: string;
}

export interface AllergenMatch {
  allergen: string;
  evidence_snippet: string;
  confidence: string;
}

export interface IngredientExplanation {
  name: string;
  code?: string;
  category: string;
  function: string;
  explanation_en: string;
  explanation_hi: string;
  caution?: string;
  source?: string;
}

export interface DeclarationCheckItem {
  field_name: string;
  label_text: string;
  is_present: boolean;
  detected_value?: string;
  rule_description: string;
  status: string;
  guidance: string;
}

export interface Product {
  id: string;
  name: string;
  brand?: string;
  category?: string;
  net_quantity_value?: number;
  net_quantity_unit?: string;
  mrp?: number;
  currency?: string;
  price_per_standard_unit?: number;
  standard_unit?: string;
  serving_size?: number;
  serving_unit?: string;
  servings_per_container?: number;
  nutrition_basis?: string;
  energy_kcal?: number;
  protein_g?: number;
  carbohydrates_g?: number;
  total_sugar_g?: number;
  added_sugar_g?: number;
  total_fat_g?: number;
  saturated_fat_g?: number;
  trans_fat_g?: number;
  cholesterol_mg?: number;
  fibre_g?: number;
  sodium_mg?: number;
  ingredients_raw?: string;
  allergens_detected: AllergenMatch[];
  allergen_statement?: string;
  mfg_date?: string;
  expiry_date?: string;
  best_before_text?: string;
  manufacturer_name?: string;
  manufacturer_address?: string;
  country_of_origin?: string;
  consumer_care_details?: string;
  raw_ocr_text?: string;
  data_source?: string;
  is_favorite?: boolean;
  is_demo?: boolean;
  created_at?: string;
  updated_at?: string;
  field_evidences?: FieldEvidence[];
}

export interface AnalyzeLabelResponse {
  product: Product;
  evidences: FieldEvidence[];
  allergens_detected: AllergenMatch[];
  ingredients_explained: IngredientExplanation[];
  declarations_checklist: DeclarationCheckItem[];
  raw_ocr_text: string;
  overall_confidence: string;
  warnings: string[];
}

export interface CalculatedNutrient {
  nutrient_name: string;
  basis_value?: number;
  portion_value?: number;
  unit: string;
}

export interface PortionCalculationResponse {
  portion_size: number;
  portion_unit: string;
  energy_kcal: number;
  formula_used: string;
  nutrients: CalculatedNutrient[];
  is_compatible: boolean;
  notice?: string;
}

export interface ComparisonRow {
  metric: string;
  unit: string;
  val_a?: number;
  val_b?: number;
  val_a_display: string;
  val_b_display: string;
  diff_display?: string;
  favorable_indicator?: string;
  note?: string;
}

export interface ProductCompareResponse {
  product_a_name: string;
  product_b_name: string;
  normalized_basis: string;
  are_units_compatible: boolean;
  incompatibility_reason?: string;
  nutrition_rows: ComparisonRow[];
  value_rows: ComparisonRow[];
  key_takeaways: string[];
  allergens_comparison: {
    product_a: { name: string; statement: string };
    product_b: { name: string; statement: string };
  };
}

export interface FoodLogEntry {
  id: string;
  product_id?: string;
  product_name: string;
  log_date: string;
  meal_type: string;
  portion_size: number;
  portion_unit: string;
  calories_consumed: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  sugar_g?: number;
  sodium_mg?: number;
  notes?: string;
  created_at?: string;
}

export interface DailyFoodLogSummary {
  log_date: string;
  total_calories: number;
  total_protein_g: number;
  total_carbs_g: number;
  total_fat_g: number;
  total_sugar_g: number;
  total_sodium_mg: number;
  entries_count: number;
  entries: FoodLogEntry[];
}

export interface Reminder {
  id: string;
  product_id?: string;
  product_name: string;
  reminder_date: string;
  expiry_date: string;
  reminder_type: string;
  status: string;
  days_left: number;
  notes?: string;
  created_at?: string;
}
