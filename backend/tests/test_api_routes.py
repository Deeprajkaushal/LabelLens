import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db import init_db

@pytest.fixture(scope="module", autouse=True)
def setup_database():
    init_db()

client = TestClient(app)

def test_health_endpoint():
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "healthy"
    assert data["app"] == "LabelLens"

def test_analyze_label_api():
    sample_text = """
    CRUNCHY OAT BARS
    Net Wt: 40g
    MRP: Rs. 25.00
    Energy: 180 kcal
    Protein: 4.5 g
    INGREDIENTS: Oats, Honey, Soy Lecithin.
    """
    resp = client.post("/api/analyze-label", json={"raw_text": sample_text})
    assert resp.status_code == 200
    data = resp.json()
    assert "CRUNCHY" in data["product"]["name"].upper()
    assert data["product"]["energy_kcal"] == 180.0
    assert data["product"]["protein_g"] == 4.5

def test_calculate_portion_api():
    payload = {
        "energy_kcal_basis": 450.0,
        "basis": "per 100g",
        "basis_quantity": 100.0,
        "portion_size": 20.0,
        "portion_unit": "g",
        "protein_g": 10.0
    }
    resp = client.post("/api/calculate-portion", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    # 450 * 20 / 100 = 90 kcal
    assert data["energy_kcal"] == 90.0

def test_product_crud_api():
    # 1. Create Product
    prod_data = {
        "name": "Organic Almond Milk",
        "brand": "PureRoots",
        "category": "Dairy Alternative",
        "net_quantity_value": 1000.0,
        "net_quantity_unit": "ml",
        "mrp": 190.0,
        "price_per_standard_unit": 19.0,
        "standard_unit": "100 ml",
        "energy_kcal": 38.0,
        "protein_g": 1.2,
        "carbohydrates_g": 3.0,
        "total_sugar_g": 2.5,
        "total_fat_g": 2.4,
        "ingredients_raw": "Water, Almonds (4%), Tricalcium Phosphate.",
        "allergens_detected": [
            {"allergen": "Tree Nuts", "evidence_snippet": "Almonds (4%)", "confidence": "Declared Ingredient"}
        ]
    }
    create_resp = client.post("/api/products", json=prod_data)
    assert create_resp.status_code == 201
    created = create_resp.json()
    prod_id = created["id"]
    assert created["name"] == "Organic Almond Milk"

    # 2. Get Product
    get_resp = client.get(f"/api/products/{prod_id}")
    assert get_resp.status_code == 200
    assert get_resp.json()["brand"] == "PureRoots"

    # 3. Update Product
    up_resp = client.put(f"/api/products/{prod_id}", json={"mrp": 185.0})
    assert up_resp.status_code == 200
    assert up_resp.json()["mrp"] == 185.0

    # 4. Toggle Favorite
    fav_resp = client.post(f"/api/products/{prod_id}/favorite")
    assert fav_resp.status_code == 200
    assert fav_resp.json()["is_favorite"] is True

    # 5. Delete Product
    del_resp = client.delete(f"/api/products/{prod_id}")
    assert del_resp.status_code == 200

def test_food_log_crud_api():
    entry_payload = {
        "product_name": "Digestive Biscuit",
        "log_date": "2026-10-13",
        "meal_type": "Snack",
        "portion_size": 25.0,
        "portion_unit": "g",
        "calories_consumed": 120.0,
        "protein_g": 2.0,
        "carbs_g": 18.0,
        "fat_g": 4.5
    }
    add_resp = client.post("/api/food-log", json=entry_payload)
    assert add_resp.status_code == 201
    entry_id = add_resp.json()["id"]

    # Get Daily Summary
    get_resp = client.get("/api/food-log?log_date=2026-10-13")
    assert get_resp.status_code == 200
    summary = get_resp.json()
    assert summary["total_calories"] >= 120.0
    assert summary["entries_count"] >= 1

    # Delete Entry
    del_resp = client.delete(f"/api/food-log/{entry_id}")
    assert del_resp.status_code == 200

def test_reminders_crud_api():
    rem_payload = {
        "product_name": "Greek Yogurt",
        "reminder_date": "2026-10-20",
        "expiry_date": "2026-10-25",
        "reminder_type": "Expiry",
        "notes": "Keep refrigerated"
    }
    create_resp = client.post("/api/reminders", json=rem_payload)
    assert create_resp.status_code == 201
    rem_id = create_resp.json()["id"]

    # List Reminders
    list_resp = client.get("/api/reminders")
    assert list_resp.status_code == 200
    assert any(r["id"] == rem_id for r in list_resp.json())

    # Update status to Dismissed
    up_resp = client.put(f"/api/reminders/{rem_id}", json={"status": "Dismissed"})
    assert up_resp.status_code == 200
    assert up_resp.json()["status"] == "Dismissed"

    # Delete reminder
    del_resp = client.delete(f"/api/reminders/{rem_id}")
    assert del_resp.status_code == 200

def test_post_scan_images_endpoint():
    from pathlib import Path
    fixture = Path(__file__).resolve().parent / "test_bottle_label.jpg"
    assert fixture.exists()

    with open(fixture, "rb") as f:
        file_bytes = f.read()

    files = [("files", ("test_bottle.jpg", file_bytes, "image/jpeg"))]
    resp = client.post("/api/scan", files=files, data={"language": "en"})
    assert resp.status_code == 200
    data = resp.json()
    assert "product" in data
    assert data["product"]["energy_kcal"] == 381.0
    assert data["product"]["carbohydrates_g"] == 86.0
    assert len(data["evidences"]) > 0
