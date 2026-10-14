from app.models.schemas import ProductBase
from app.services.comparator import compare_products_logic

def test_compare_compatible_products():
    prod_a = ProductBase(
        name="Brand A Cookies",
        net_quantity_value=150.0,
        net_quantity_unit="g",
        mrp=45.0,
        price_per_standard_unit=30.0,
        energy_kcal=480.0,
        protein_g=7.5,
        total_sugar_g=24.0,
        total_fat_g=20.0
    )
    prod_b = ProductBase(
        name="Brand B Biscuits",
        net_quantity_value=200.0,
        net_quantity_unit="g",
        mrp=50.0,
        price_per_standard_unit=25.0,
        energy_kcal=440.0,
        protein_g=9.0,
        total_sugar_g=18.0,
        total_fat_g=15.0
    )

    res = compare_products_logic(prod_a, prod_b)
    assert res.are_units_compatible is True
    assert res.normalized_basis == "per 100 g"
    assert len(res.nutrition_rows) > 0
    assert len(res.key_takeaways) > 0

    # Brand B has more protein (9.0 vs 7.5 -> 1.5g diff)
    prot_row = next(r for r in res.nutrition_rows if r.metric == "Protein")
    assert prot_row.favorable_indicator == "b"

    # Brand B has less sugar (18 vs 24 -> favorable for low sugar)
    sugar_row = next(r for r in res.nutrition_rows if r.metric == "Total Sugars")
    assert sugar_row.favorable_indicator == "b"

def test_compare_incompatible_units():
    prod_cookie = ProductBase(
        name="Cookies",
        net_quantity_value=100.0,
        net_quantity_unit="g",
        energy_kcal=450.0
    )
    prod_juice = ProductBase(
        name="Juice",
        net_quantity_value=1000.0,
        net_quantity_unit="ml",
        energy_kcal=54.0
    )
    res = compare_products_logic(prod_cookie, prod_juice)
    assert res.are_units_compatible is False
    assert res.incompatibility_reason is not None

def test_compare_missing_data_not_zero():
    prod_a = ProductBase(name="Product A", energy_kcal=400.0, protein_g=None)
    prod_b = ProductBase(name="Product B", energy_kcal=350.0, protein_g=10.0)

    res = compare_products_logic(prod_a, prod_b)
    prot_row = next(r for r in res.nutrition_rows if r.metric == "Protein")
    assert prot_row.val_a is None
    assert prot_row.val_a_display == "Not declared"
    assert "missing data" in (prot_row.diff_display or "").lower()
