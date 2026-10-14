from app.services.ingredient_db import (
    search_ingredients,
    find_ingredient_by_query,
    extract_and_explain_ingredients
)

def test_search_by_code():
    res = search_ingredients("500(ii)")
    assert len(res) > 0
    item = res[0]
    assert "Sodium Bicarbonate" in item.name
    assert "INS 500(ii)" in item.code
    assert item.explanation_en != ""
    assert item.explanation_hi != ""

def test_search_by_name_and_hindi():
    res = search_ingredients("Lecithin")
    assert len(res) > 0
    item = res[0]
    assert "Lecithin" in item.name
    assert "सोयाबीन" in item.explanation_hi

def test_extract_from_ingredients_string():
    raw_ing = "Sugar, Cocoa Solids, Emulsifier (INS 322(i)), Acidity Regulator (INS 330), Preservative (INS 211)."
    explained = extract_and_explain_ingredients(raw_ing)
    names = [e.name for e in explained]
    assert any("Lecithin" in n for n in names)
    assert any("Citric Acid" in n for n in names)
    assert any("Sodium Benzoate" in n for n in names)

def test_unfamiliar_ingredient():
    res = find_ingredient_by_query("Unobtainium Acid 9999")
    assert res is None
