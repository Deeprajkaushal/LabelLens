from typing import Dict, Any, List, Optional
from app.models.schemas import PortionCalculateResponse, CalculatedNutrient

def normalize_unit(unit: str) -> str:
    u = unit.strip().lower()
    if u in ["g", "gm", "gms", "gram", "grams"]:
        return "g"
    if u in ["kg", "kgs", "kilogram", "kilograms"]:
        return "kg"
    if u in ["ml", "millilitre", "millilitres", "milliliter", "milliliters"]:
        return "ml"
    if u in ["l", "ltr", "litre", "litres", "liter", "liters"]:
        return "l"
    return u

def calculate_portion_calories(
    energy_kcal_basis: float,
    basis: str,
    basis_quantity: float,
    portion_size: float,
    portion_unit: str,
    nutrients_dict: Optional[Dict[str, Optional[float]]] = None
) -> PortionCalculateResponse:
    """
    Calculates calories and macronutrients for a given portion size.
    Formulas:
      - If basis is per 100g/ml: kcal = (energy_per_100 * portion_size) / 100
      - If basis is per serving: kcal = (energy_per_serving * portion_size) / serving_size
    """
    if portion_size <= 0:
        raise ValueError("Portion size must be greater than zero.")
    if basis_quantity <= 0:
        basis_quantity = 100.0

    norm_portion_unit = normalize_unit(portion_unit)
    
    # Check compatibility
    is_liquid_basis = "ml" in basis.lower()
    is_mass_basis = "g" in basis.lower() or "kg" in basis.lower()

    notice = None
    converted_portion = portion_size

    if norm_portion_unit == "kg":
        converted_portion = portion_size * 1000.0
        norm_portion_unit = "g"
    elif norm_portion_unit == "l":
        converted_portion = portion_size * 1000.0
        norm_portion_unit = "ml"

    if is_liquid_basis and norm_portion_unit == "g":
        notice = "Note: Package reports nutrition per millilitre (ml), but portion was entered in grams (g). Assumed 1g ≈ 1ml for water-like liquids."
    elif is_mass_basis and norm_portion_unit == "ml":
        notice = "Note: Package reports nutrition per gram (g), but portion was entered in millilitres (ml). Assumed 1ml ≈ 1g."

    ratio = converted_portion / basis_quantity
    portion_kcal = round(energy_kcal_basis * ratio, 2)

    formula_str = (
        f"{energy_kcal_basis} kcal × {converted_portion} {norm_portion_unit} ÷ {basis_quantity} = {portion_kcal} kcal"
    )

    calculated_nutrients: List[CalculatedNutrient] = []
    
    nutrients_meta = [
        ("Protein", "protein_g", "g"),
        ("Carbohydrates", "carbohydrates_g", "g"),
        ("Total Sugars", "total_sugar_g", "g"),
        ("Added Sugars", "added_sugar_g", "g"),
        ("Total Fat", "total_fat_g", "g"),
        ("Saturated Fat", "saturated_fat_g", "g"),
        ("Trans Fat", "trans_fat_g", "g"),
        ("Dietary Fibre", "fibre_g", "g"),
        ("Sodium", "sodium_mg", "mg"),
    ]

    if nutrients_dict:
        for display_name, key, unit in nutrients_meta:
            basis_val = nutrients_dict.get(key)
            if basis_val is not None:
                portion_val = round(basis_val * ratio, 2)
                calculated_nutrients.append(
                    CalculatedNutrient(
                        nutrient_name=display_name,
                        basis_value=basis_val,
                        portion_value=portion_val,
                        unit=unit
                    )
                )

    return PortionCalculateResponse(
        portion_size=portion_size,
        portion_unit=portion_unit,
        energy_kcal=portion_kcal,
        formula_used=formula_str,
        nutrients=calculated_nutrients,
        is_compatible=True,
        notice=notice
    )
