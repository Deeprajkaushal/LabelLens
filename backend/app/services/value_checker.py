from typing import Dict, Any, Optional

def calculate_unit_price(
    mrp: float,
    net_quantity: float,
    unit: str
) -> Dict[str, Any]:
    """
    Calculates standard unit prices (per 100g/ml and per kg/L) with formulas.
    Validates against zero or negative values.
    """
    if mrp <= 0:
        raise ValueError("MRP must be greater than zero.")
    if net_quantity <= 0:
        raise ValueError("Net quantity must be greater than zero.")

    clean_unit = unit.strip().lower()

    is_mass = clean_unit in ["g", "gm", "gms", "gram", "grams", "kg", "kgs", "kilogram"]
    is_liquid = clean_unit in ["ml", "millilitre", "millilitres", "l", "ltr", "litre", "litres"]

    if not is_mass and not is_liquid:
        return {
            "is_valid": False,
            "error": f"Unsupported unit '{unit}'. Unit pricing supports mass (g, kg) and volume (ml, L)."
        }

    # Convert to base unit: grams or millilitres
    base_quantity: float
    base_unit: str
    standard_small_unit: str
    standard_large_unit: str

    if is_mass:
        if clean_unit in ["kg", "kgs", "kilogram"]:
            base_quantity = net_quantity * 1000.0
        else:
            base_quantity = net_quantity
        base_unit = "g"
        standard_small_unit = "100 g"
        standard_large_unit = "1 kg"
    else:
        if clean_unit in ["l", "ltr", "litre", "litres"]:
            base_quantity = net_quantity * 1000.0
        else:
            base_quantity = net_quantity
        base_unit = "ml"
        standard_small_unit = "100 ml"
        standard_large_unit = "1 L"

    price_per_base = mrp / base_quantity
    price_per_100 = round(price_per_base * 100.0, 2)
    price_per_bulk = round(price_per_base * 1000.0, 2)

    small_formula = f"₹{mrp:.2f} ÷ {base_quantity:.1f} {base_unit} × 100 = ₹{price_per_100:.2f} per {standard_small_unit}"
    large_formula = f"₹{mrp:.2f} ÷ {base_quantity:.1f} {base_unit} × 1000 = ₹{price_per_bulk:.2f} per {standard_large_unit}"

    return {
        "is_valid": True,
        "mrp": mrp,
        "net_quantity_base": base_quantity,
        "base_unit": base_unit,
        "price_per_100": price_per_100,
        "standard_small_unit": standard_small_unit,
        "price_per_bulk": price_per_bulk,
        "standard_large_unit": standard_large_unit,
        "small_formula": small_formula,
        "large_formula": large_formula,
        "unit_type": "mass" if is_mass else "volume"
    }
