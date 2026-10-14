import pytest
from app.services.value_checker import calculate_unit_price

def test_unit_price_grams():
    # 150g for Rs 45 -> Price per 100g is (45 / 150) * 100 = Rs 30.00
    res = calculate_unit_price(mrp=45.0, net_quantity=150.0, unit="g")
    assert res["is_valid"] is True
    assert res["price_per_100"] == 30.0
    assert res["price_per_bulk"] == 300.0
    assert res["standard_small_unit"] == "100 g"
    assert "₹45.00 ÷ 150.0 g × 100 = ₹30.00" in res["small_formula"]

def test_unit_price_kg():
    # 1.5 kg for Rs 300 -> 1500g -> per 100g is (300 / 1500) * 100 = Rs 20.00
    res = calculate_unit_price(mrp=300.0, net_quantity=1.5, unit="kg")
    assert res["is_valid"] is True
    assert res["price_per_100"] == 20.0
    assert res["price_per_bulk"] == 200.0

def test_unit_price_millilitres():
    # 1000 ml for Rs 130 -> Price per 100ml is 13.00
    res = calculate_unit_price(mrp=130.0, net_quantity=1000.0, unit="ml")
    assert res["is_valid"] is True
    assert res["price_per_100"] == 13.0
    assert res["standard_small_unit"] == "100 ml"

def test_unit_price_litres():
    # 2 L for Rs 180 -> 2000 ml -> Price per 100ml is 9.00
    res = calculate_unit_price(mrp=180.0, net_quantity=2.0, unit="L")
    assert res["is_valid"] is True
    assert res["price_per_100"] == 9.0

def test_unit_price_invalid_inputs():
    with pytest.raises(ValueError):
        calculate_unit_price(mrp=0, net_quantity=100.0, unit="g")
    with pytest.raises(ValueError):
        calculate_unit_price(mrp=50.0, net_quantity=-10.0, unit="g")
