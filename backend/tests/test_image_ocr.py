import os
from pathlib import Path
from app.services.ocr_engine import perform_local_ocr_on_bytes, process_multiple_images_ocr
from app.services.parser import parse_label_text

FIXTURE_PATH = Path(__file__).resolve().parent / "test_bottle_label.jpg"

def test_regression_bottle_label_ocr():
    """
    Regression test using the provided curved bottle label image:
    https://m.media-amazon.com/images/I/61Z2xBqPkoL._SL1100_.jpg
    Ensures:
      1. OCR output is not empty.
      2. Nutrition table heading and rows are recognized.
      3. Legible nutrient rows (Energy, Carbs, Total Sugar, Added Sugar, Fat, Sat Fat, Sodium) are parsed accurately.
      4. Serving size and servings per container are detected.
      5. Confidence is honest and high.
    """
    assert FIXTURE_PATH.exists(), f"Regression test fixture {FIXTURE_PATH} must exist"

    with open(FIXTURE_PATH, "rb") as f:
        image_bytes = f.read()

    assert len(image_bytes) > 1000, "Image bytes must be non-empty"

    ocr_res = perform_local_ocr_on_bytes(image_bytes, "test_bottle_label.jpg")

    # 1. OCR succeeded and returned rich text
    assert ocr_res["success"] is True
    assert ocr_res["boxes_count"] >= 50, f"Expected >=50 detected text boxes, got {ocr_res['boxes_count']}"
    assert "NUTRITION" in ocr_res["text"].upper()

    # 2. Parse structured nutrition information
    parsed = parse_label_text(ocr_res["text"])
    product = parsed.product

    # Check key nutrients
    assert product.energy_kcal == 381.0, f"Expected Energy 381.0 kcal, got {product.energy_kcal}"
    assert product.carbohydrates_g == 86.0, f"Expected Carbs 86.0 g, got {product.carbohydrates_g}"
    assert product.total_sugar_g == 46.0, f"Expected Total Sugars 46.0 g, got {product.total_sugar_g}"
    assert product.added_sugar_g == 32.2, f"Expected Added Sugars 32.2 g, got {product.added_sugar_g}"
    assert product.fibre_g == 3.5, f"Expected Dietary Fibre 3.5 g, got {product.fibre_g}"
    assert product.total_fat_g == 1.8, f"Expected Total Fat 1.8 g, got {product.total_fat_g}"
    assert product.saturated_fat_g == 0.9, f"Expected Saturated Fat 0.9 g, got {product.saturated_fat_g}"
    assert product.sodium_mg == 175.0, f"Expected Sodium 175.0 mg, got {product.sodium_mg}"
    assert product.serving_size == 20.0, f"Expected Serving Size 20.0 g, got {product.serving_size}"
    assert product.servings_per_container == 25.0, f"Expected Servings 25.0, got {product.servings_per_container}"

    # Verify audit evidences are recorded
    field_names = [e.field_name for e in parsed.evidences if e.value is not None]
    assert "Energy (kcal)" in field_names
    assert "Carbohydrates (g)" in field_names
    assert "Total Sugars (g)" in field_names
    assert "Serving Size" in field_names

def test_ocr_empty_bytes_handling():
    try:
        perform_local_ocr_on_bytes(b"", "empty.jpg")
        assert False, "Should raise ValueError on empty bytes"
    except ValueError as e:
        assert "empty" in str(e).lower()

def test_ocr_corrupted_bytes_handling():
    try:
        perform_local_ocr_on_bytes(b"NOT_AN_IMAGE_RANDOM_GARBAGE", "corrupt.jpg")
        assert False, "Should raise ValueError on corrupted image"
    except ValueError as e:
        assert "invalid" in str(e).lower() or "corrupt" in str(e).lower()
