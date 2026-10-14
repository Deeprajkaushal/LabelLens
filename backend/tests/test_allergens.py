from app.services.allergens import detect_allergens_in_text

def test_detect_declared_allergens():
    ingredients = "Refined Wheat Flour, Sugar, Roasted Peanuts (10%), Soy Lecithin, Milk Solids."
    detected = detect_allergens_in_text(ingredients, "")
    
    allergen_names = [a.allergen for a in detected]
    assert "Wheat / Gluten" in allergen_names
    assert "Peanuts" in allergen_names
    assert "Soy / Soya" in allergen_names
    assert "Milk / Dairy" in allergen_names

    # Check evidence snippet
    peanut_match = next(a for a in detected if a.allergen == "Peanuts")
    assert "Roasted Peanuts" in peanut_match.evidence_snippet
    assert peanut_match.confidence == "Declared Ingredient"

def test_detect_precautionary_allergen_statement():
    ingredients = "Rolled Oats, Honey, Dried Berries."
    statement = "Manufactured in a facility that processes Tree Nuts and Sesame. May contain traces of Milk."
    detected = detect_allergens_in_text(ingredients, statement)

    allergen_names = [a.allergen for a in detected]
    assert "Tree Nuts" in allergen_names
    assert "Sesame" in allergen_names
    assert "Milk / Dairy" in allergen_names

    milk_match = next(a for a in detected if a.allergen == "Milk / Dairy")
    assert "traces of Milk" in milk_match.evidence_snippet
    assert milk_match.confidence == "Precautionary / Cross-contact"

def test_no_allergens_found():
    ingredients = "Pure Apple Juice, Water, Citric Acid."
    detected = detect_allergens_in_text(ingredients, "")
    assert len(detected) == 0
