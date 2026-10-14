from app.services.parser import parse_label_text

SAMPLE_COOKIE_TEXT = """
GRAINBAKES NUTRCRUNCH CHOCO-OAT COOKIES
Net Wt: 150g
MRP Rs. 45.00 (Incl. of all taxes)
Pkg Dt: 15/08/2026
Best Before 6 months from packaging
NUTRITIONAL INFORMATION Per 100g:
Energy 480 kcal
Protein 7.5 g
Carbohydrate 66.0 g
Total Sugars 24.5 g
Added Sugars 22.0 g
Total Fat 21.0 g
Saturated Fat 9.8 g
Dietary Fibre 5.2 g
Sodium 280 mg
INGREDIENTS: Rolled Oats (32%), Refined Wheat Flour (Maida) (24%), Sugar, Edible Vegetable Oil (Palm Oil), Chocolate Chips (10%), Raising Agents [INS 500(ii)], Emulsifier (INS 322(i)).
Allergen Advice: Contains Wheat, Oats, and Soy. May contain Milk.
Mfd by GrainBakes Confectionery Pvt Ltd, Plot 42, Pune 411028. Country of Origin: India. Feedback: care@grainbakes.com
"""

def test_parse_sample_cookie_label():
    res = parse_label_text(SAMPLE_COOKIE_TEXT)
    p = res.product

    assert "COOKIES" in p.name.upper()
    assert p.net_quantity_value == 150.0
    assert p.net_quantity_unit == "g"
    assert p.mrp == 45.0
    assert p.price_per_standard_unit == 30.0  # 45 / 150 * 100
    assert p.energy_kcal == 480.0
    assert p.protein_g == 7.5
    assert p.carbohydrates_g == 66.0
    assert p.total_sugar_g == 24.5
    assert p.total_fat_g == 21.0
    assert p.saturated_fat_g == 9.8
    assert p.fibre_g == 5.2
    assert p.sodium_mg == 280.0
    assert p.mfg_date == "15/08/2026"
    assert "Best Before" in (p.best_before_text or "")
    assert p.country_of_origin == "India"
    assert "care@grainbakes.com" in (p.consumer_care_details or "")

    # Allergen detection
    allergen_names = [a.allergen for a in res.allergens_detected]
    assert "Wheat / Gluten" in allergen_names
    assert "Soy / Soya" in allergen_names

    # Declarations checklist
    present_items = [c for c in res.declarations_checklist if c.is_present]
    assert len(present_items) >= 6

def test_parse_label_with_missing_fields():
    # Only price and name, no nutrition or net quantity
    partial_text = "FARM FRESH CRACKERS\nMRP Rs. 20.00"
    res = parse_label_text(partial_text)
    p = res.product

    assert p.mrp == 20.0
    assert p.net_quantity_value is None
    assert p.energy_kcal is None
    assert p.protein_g is None
    assert res.overall_confidence == "Uncertain"
    assert len(res.warnings) > 0
