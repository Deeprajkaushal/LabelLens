from typing import Dict, Any, List, Optional
from app.models.schemas import ProductBase, ProductCompareResponse, ComparisonRow

def compare_products_logic(
    prod_a: ProductBase,
    prod_b: ProductBase
) -> ProductCompareResponse:
    """
    Fair, normalized side-by-side comparison between two products.
    Does not label one product as universally 'healthier'—lets consumers make informed decisions.
    """
    unit_a = (prod_a.net_quantity_unit or "g").strip().lower()
    unit_b = (prod_b.net_quantity_unit or "g").strip().lower()

    is_a_liquid = unit_a in ["ml", "l", "ltr", "litre"]
    is_b_liquid = unit_b in ["ml", "l", "ltr", "litre"]

    are_units_compatible = (is_a_liquid == is_b_liquid)
    incompatibility_reason = None
    if not are_units_compatible:
        incompatibility_reason = (
            f"Comparing solid food ({unit_a}) with liquid beverage ({unit_b}). "
            "Nutritional density differs significantly between liquids and solids."
        )

    normalized_basis = "per 100 ml" if is_a_liquid and is_b_liquid else "per 100 g"

    # Nutrition Metrics
    metrics_to_compare = [
        ("Energy", "kcal", prod_a.energy_kcal, prod_b.energy_kcal, "neutral"),
        ("Protein", "g", prod_a.protein_g, prod_b.protein_g, "high"),
        ("Carbohydrates", "g", prod_a.carbohydrates_g, prod_b.carbohydrates_g, "neutral"),
        ("Total Sugars", "g", prod_a.total_sugar_g, prod_b.total_sugar_g, "low"),
        ("Added Sugars", "g", prod_a.added_sugar_g, prod_b.added_sugar_g, "low"),
        ("Total Fat", "g", prod_a.total_fat_g, prod_b.total_fat_g, "low"),
        ("Saturated Fat", "g", prod_a.saturated_fat_g, prod_b.saturated_fat_g, "low"),
        ("Dietary Fibre", "g", prod_a.fibre_g, prod_b.fibre_g, "high"),
        ("Sodium", "mg", prod_a.sodium_mg, prod_b.sodium_mg, "low")
    ]

    nutrition_rows: List[ComparisonRow] = []
    key_takeaways: List[str] = []

    for name, unit, val_a, val_b, pref in metrics_to_compare:
        display_a = f"{val_a:.1f} {unit}" if val_a is not None else "Not declared"
        display_b = f"{val_b:.1f} {unit}" if val_b is not None else "Not declared"
        diff_str = None
        favorable = "neutral"

        if val_a is not None and val_b is not None:
            diff = round(val_a - val_b, 2)
            if diff > 0:
                diff_str = f"+{diff:.1f} in {prod_a.name}"
            elif diff < 0:
                diff_str = f"+{abs(diff):.1f} in {prod_b.name}"
            else:
                diff_str = "Equal"

            # Neutral indicator
            if diff != 0:
                if pref == "high":
                    favorable = "a" if diff > 0 else "b"
                elif pref == "low":
                    favorable = "b" if diff > 0 else "a"
                else:
                    favorable = "neutral"

                # Key takeaways for major nutrients
                if name == "Protein" and abs(diff) >= 1.0:
                    leader = prod_a.name if diff > 0 else prod_b.name
                    key_takeaways.append(f"{leader} has {abs(diff):.1f}g more protein {normalized_basis}.")
                elif name == "Total Sugars" and abs(diff) >= 2.0:
                    leader = prod_b.name if diff > 0 else prod_a.name
                    key_takeaways.append(f"{leader} has {abs(diff):.1f}g less total sugar {normalized_basis}.")
                elif name == "Saturated Fat" and abs(diff) >= 1.0:
                    leader = prod_b.name if diff > 0 else prod_a.name
                    key_takeaways.append(f"{leader} has {abs(diff):.1f}g less saturated fat {normalized_basis}.")
        else:
            diff_str = "Comparison unavailable (missing data)"

        nutrition_rows.append(
            ComparisonRow(
                metric=name,
                unit=unit,
                val_a=val_a,
                val_b=val_b,
                val_a_display=display_a,
                val_b_display=display_b,
                diff_display=diff_str,
                favorable_indicator=favorable
            )
        )

    # Value & Package metrics
    value_rows: List[ComparisonRow] = []

    # MRP
    mrp_a_display = f"₹{prod_a.mrp:.2f}" if prod_a.mrp else "Unknown"
    mrp_b_display = f"₹{prod_b.mrp:.2f}" if prod_b.mrp else "Unknown"
    value_rows.append(
        ComparisonRow(
            metric="Package MRP",
            unit="₹",
            val_a=prod_a.mrp,
            val_b=prod_b.mrp,
            val_a_display=mrp_a_display,
            val_b_display=mrp_b_display,
            diff_display=f"₹{abs((prod_a.mrp or 0) - (prod_b.mrp or 0)):.2f} difference" if prod_a.mrp and prod_b.mrp else None,
            favorable_indicator="neutral"
        )
    )

    # Net quantity
    qty_a_display = f"{prod_a.net_quantity_value or 'Unknown'} {prod_a.net_quantity_unit or ''}"
    qty_b_display = f"{prod_b.net_quantity_value or 'Unknown'} {prod_b.net_quantity_unit or ''}"
    value_rows.append(
        ComparisonRow(
            metric="Net Quantity",
            unit="",
            val_a=prod_a.net_quantity_value,
            val_b=prod_b.net_quantity_value,
            val_a_display=qty_a_display,
            val_b_display=qty_b_display,
            favorable_indicator="neutral"
        )
    )

    # Price per 100g/ml
    price_100_a = prod_a.price_per_standard_unit
    price_100_b = prod_b.price_per_standard_unit

    if are_units_compatible and price_100_a and price_100_b:
        p_diff = round(price_100_a - price_100_b, 2)
        diff_label = f"₹{abs(p_diff):.2f} cheaper in {prod_b.name if p_diff > 0 else prod_a.name} per 100g/ml"
        cheaper = "b" if p_diff > 0 else "a"
        if p_diff == 0:
            diff_label = "Identical unit price"
            cheaper = "equal"
        value_rows.append(
            ComparisonRow(
                metric=f"Unit Price ({normalized_basis})",
                unit="₹",
                val_a=price_100_a,
                val_b=price_100_b,
                val_a_display=f"₹{price_100_a:.2f}",
                val_b_display=f"₹{price_100_b:.2f}",
                diff_display=diff_label,
                favorable_indicator=cheaper
            )
        )
        if p_diff != 0:
            key_takeaways.append(diff_label)
    else:
        value_rows.append(
            ComparisonRow(
                metric="Unit Price Comparison",
                unit="",
                val_a_display=f"₹{price_100_a:.2f}" if price_100_a else "N/A",
                val_b_display=f"₹{price_100_b:.2f}" if price_100_b else "N/A",
                diff_display="Incompatible units or missing price"
            )
        )

    # Allergens Comparison
    allergens_comparison = {
        "product_a": {
            "name": prod_a.name,
            "statement": prod_a.allergen_statement or "None declared",
        },
        "product_b": {
            "name": prod_b.name,
            "statement": prod_b.allergen_statement or "None declared",
        }
    }

    if not key_takeaways:
        key_takeaways.append("Both products have comparable profiles or missing nutritional data.")

    return ProductCompareResponse(
        product_a_name=prod_a.name,
        product_b_name=prod_b.name,
        normalized_basis=normalized_basis,
        are_units_compatible=are_units_compatible,
        incompatibility_reason=incompatibility_reason,
        nutrition_rows=nutrition_rows,
        value_rows=value_rows,
        key_takeaways=key_takeaways,
        allergens_comparison=allergens_comparison
    )
