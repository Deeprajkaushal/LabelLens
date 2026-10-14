import pytest
from app.services.nutrition import calculate_portion_calories, normalize_unit

def test_normalize_unit():
    assert normalize_unit("GMS") == "g"
    assert normalize_unit("grams") == "g"
    assert normalize_unit("kg") == "kg"
    assert normalize_unit("ML") == "ml"
    assert normalize_unit("litres") == "l"

def test_portion_calories_standard_100g():
    # Example: 450 kcal per 100g, 30g portion -> 135 kcal
    nutrients = {
        "protein_g": 8.0,
        "total_sugar_g": 20.0,
        "total_fat_g": 18.0
    }
    res = calculate_portion_calories(
        energy_kcal_basis=450.0,
        basis="per 100g",
        basis_quantity=100.0,
        portion_size=30.0,
        portion_unit="g",
        nutrients_dict=nutrients
    )
    assert res.energy_kcal == 135.0
    assert "450.0 kcal × 30.0 g ÷ 100" in res.formula_used
    assert len(res.nutrients) == 3

    # Check scaled nutrients: 8.0 * 30/100 = 2.4g protein
    prot = next(n for n in res.nutrients if n.nutrient_name == "Protein")
    assert prot.portion_value == 2.4

def test_portion_calories_liquid_ml():
    res = calculate_portion_calories(
        energy_kcal_basis=54.0,
        basis="per 100ml",
        basis_quantity=100.0,
        portion_size=200.0,
        portion_unit="ml"
    )
    # 54 * 200 / 100 = 108 kcal
    assert res.energy_kcal == 108.0

def test_portion_calories_kg_conversion():
    res = calculate_portion_calories(
        energy_kcal_basis=400.0,
        basis="per 100g",
        basis_quantity=100.0,
        portion_size=0.05,  # 0.05 kg = 50 g
        portion_unit="kg"
    )
    # 400 * 50 / 100 = 200 kcal
    assert res.energy_kcal == 200.0

def test_portion_calories_invalid_inputs():
    with pytest.raises(ValueError):
        calculate_portion_calories(
            energy_kcal_basis=400.0,
            basis="per 100g",
            basis_quantity=100.0,
            portion_size=0,
            portion_unit="g"
        )
    with pytest.raises(ValueError):
        calculate_portion_calories(
            energy_kcal_basis=400.0,
            basis="per 100g",
            basis_quantity=100.0,
            portion_size=-10.0,
            portion_unit="g"
        )
