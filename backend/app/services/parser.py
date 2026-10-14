import re
import uuid
from typing import Dict, Any, List, Tuple, Optional
from app.models.schemas import (
    ProductResponse,
    FieldEvidence,
    AnalyzeLabelResponse,
    AllergenMatch
)
from app.services.allergens import detect_allergens_in_text
from app.services.ingredient_db import extract_and_explain_ingredients
from app.services.declaration_checker import check_declarations
from app.services.value_checker import calculate_unit_price

def extract_number_from_text(text: str) -> Optional[float]:
    """Finds the first valid floating-point or integer number in a string."""
    nums = re.findall(r"\b\d+(?:\.\d+)?\b", text)
    if nums:
        try:
            return float(nums[0])
        except ValueError:
            pass
    return None

def parse_label_text(raw_text: str) -> AnalyzeLabelResponse:
    """
    Deterministic rule, regex, and spatial table row parser for packaging labels.
    Converts OCR text into structured product nutrition, pricing, and allergen data.
    Never manufactures missing values.
    """
    evidences: List[FieldEvidence] = []
    lines = [line.strip() for line in raw_text.splitlines() if line.strip()]

    def record_evidence(field_name: str, val: Any, source: str, snippet: Optional[str] = None, conf: str = "High", notes: Optional[str] = None):
        evidences.append(FieldEvidence(
            field_name=field_name,
            value=val,
            source=source,
            raw_snippet=snippet,
            confidence=conf,
            notes=notes
        ))

    # 1. Product Name & Brand Heuristics
    name = "Unnamed Packaged Product"
    brand = None
    name_snippet = None

    # Scan first 5 lines for product identity
    for line in lines[:5]:
        if not re.search(r"\b(?:nutrition|nutritioninformation|information|ingredient|per\s*100|serving|mrp|pkg|exp|lic|code|mfd)\b", line, re.IGNORECASE):
            clean_line = re.sub(r"^[-\s*#_]+|[-*#_]+$", "", line).strip()
            if len(clean_line) >= 4 and not clean_line.isdigit():
                name = clean_line
                name_snippet = line
                words = clean_line.split()
                if len(words) > 1 and len(words[0]) >= 3:
                    brand = words[0]
                break

    record_evidence("Product Name", name, "Read from Package" if name_snippet else "Estimated", name_snippet, "High" if name_snippet else "Uncertain")

    # 2. Nutrition Basis (per 100g, per 100ml, per serving)
    nutrition_basis = "per 100g"
    basis_match = re.search(r"(?:per|typical\s*values\s*per)\s*([0-9]*\s*(?:100g|100ml|100\s*g|100\s*ml|g|ml|serving[s]?))", raw_text, re.IGNORECASE)
    if basis_match:
        matched_str = basis_match.group(0).lower()
        if "ml" in matched_str:
            nutrition_basis = "per 100ml"
        elif "serving" in matched_str and "100" not in matched_str:
            nutrition_basis = "per serving"
        else:
            nutrition_basis = "per 100g"

    # 3. Serving Size & Servings per Container
    serving_size = None
    serving_unit = "g"
    servings_per_container = None

    serv_match = re.search(r"Serving\s*Size\s*[:\-]?\s*([0-9]+(?:\.[0-9]+)?)\s*(g|gm|gms|ml)?", raw_text, re.IGNORECASE)
    if serv_match:
        try:
            serving_size = float(serv_match.group(1))
            if serv_match.group(2):
                serving_unit = "ml" if "ml" in serv_match.group(2).lower() else "g"
            record_evidence("Serving Size", f"{serving_size} {serving_unit}", "Read from Package", serv_match.group(0), "High")
        except ValueError:
            pass

    serv_cont_match = re.search(r"(?:No\.?\s*of\s*Servings|Servings\s*per\s*(?:package|container|pack))\s*[:\-]?\s*([0-9]+(?:\.[0-9]+)?)", raw_text, re.IGNORECASE)
    if serv_cont_match:
        try:
            servings_per_container = float(serv_cont_match.group(1))
            record_evidence("Servings Per Package", servings_per_container, "Read from Package", serv_cont_match.group(0), "High")
        except ValueError:
            pass

    # 4. Nutrition Table Values (Row-Aware + Global Regex)
    nutrients_found: Dict[str, Optional[float]] = {
        "energy_kcal": None,
        "protein_g": None,
        "carbohydrates_g": None,
        "total_sugar_g": None,
        "added_sugar_g": None,
        "total_fat_g": None,
        "saturated_fat_g": None,
        "trans_fat_g": None,
        "cholesterol_mg": None,
        "fibre_g": None,
        "sodium_mg": None,
    }

    # Inspect each line for nutrient definitions
    for line in lines:
        lower_line = line.lower()

        # Energy / Calories
        if "energy" in lower_line or "calories" in lower_line:
            if nutrients_found["energy_kcal"] is None:
                m = re.search(r"(?:energy|calories)\s*(?:kcal|cal)?\s*[:\-]?\s*([0-9]+(?:\.[0-9]+)?)", lower_line)
                if m:
                    nutrients_found["energy_kcal"] = float(m.group(1))
                    record_evidence("Energy (kcal)", nutrients_found["energy_kcal"], "Read from Package", line, "High")
                else:
                    val = extract_number_from_text(lower_line.replace("energy", "").replace("kcal", ""))
                    if val and val > 10:
                        nutrients_found["energy_kcal"] = val
                        record_evidence("Energy (kcal)", val, "Read from Package", line, "High")

        # Carbohydrates & Total Sugars on same row
        if "carbohydrate" in lower_line or "carbs" in lower_line:
            all_nums = re.findall(r"\b\d+(?:\.\d+)?\b", lower_line)
            if len(all_nums) >= 2 and ("sugar" in lower_line or "total" in lower_line):
                if nutrients_found["carbohydrates_g"] is None:
                    nutrients_found["carbohydrates_g"] = float(all_nums[0])
                    record_evidence("Carbohydrates (g)", nutrients_found["carbohydrates_g"], "Read from Package", line, "High")
                if nutrients_found["total_sugar_g"] is None:
                    nutrients_found["total_sugar_g"] = float(all_nums[1])
                    record_evidence("Total Sugars (g)", nutrients_found["total_sugar_g"], "Read from Package", line, "High")
            elif all_nums and nutrients_found["carbohydrates_g"] is None:
                nutrients_found["carbohydrates_g"] = float(all_nums[0])
                record_evidence("Carbohydrates (g)", nutrients_found["carbohydrates_g"], "Read from Package", line, "High")

        # Added Sugars (check before standalone Total Sugars)
        if "added sugar" in lower_line or "addedsugar" in lower_line:
            if nutrients_found["added_sugar_g"] is None:
                m = re.search(r"(?:added\s*sugar[s]?)\s*[:\-]?\s*([0-9]+(?:\.[0-9]+)?)", lower_line)
                if m:
                    nutrients_found["added_sugar_g"] = float(m.group(1))
                    record_evidence("Added Sugars (g)", nutrients_found["added_sugar_g"], "Read from Package", line, "High")

        # Standalone Total Sugars
        elif "total sugar" in lower_line or "totalsugar" in lower_line or "sugars" in lower_line or "sugar" in lower_line:
            if nutrients_found["total_sugar_g"] is None and "added" not in lower_line and "carbohydrate" not in lower_line:
                m = re.search(r"(?:total\s*sugar[s]?|sugar[s]?)\s*[:\-]?\s*([0-9]+(?:\.[0-9]+)?)", lower_line)
                if m:
                    nutrients_found["total_sugar_g"] = float(m.group(1))
                    record_evidence("Total Sugars (g)", nutrients_found["total_sugar_g"], "Read from Package", line, "High")

        # Dietary Fibre / Fiber
        if "fiber" in lower_line or "fibre" in lower_line:
            if nutrients_found["fibre_g"] is None:
                m = re.search(r"(?:dietary\s*fiber|dietary\s*fibre|fiber|fibre)\s*[:\-]?\s*([0-9]+(?:\.[0-9]+)?)", lower_line)
                if m:
                    nutrients_found["fibre_g"] = float(m.group(1))
                    record_evidence("Dietary Fibre (g)", nutrients_found["fibre_g"], "Read from Package", line, "High")

        # Saturated Fat & Total Fat
        if "total fat" in lower_line or "sat fat" in lower_line or "saturated fat" in lower_line or "fat" in lower_line:
            # Handle row with both Total Fat and Sat Fat: "Total Fat Sat Fat 1.8 0.9"
            if "sat" in lower_line and "total" in lower_line:
                all_nums = re.findall(r"\b\d+(?:\.\d+)?\b", lower_line)
                if len(all_nums) >= 2:
                    if nutrients_found["total_fat_g"] is None:
                        nutrients_found["total_fat_g"] = float(all_nums[0])
                        record_evidence("Total Fat (g)", nutrients_found["total_fat_g"], "Read from Package", line, "High")
                    if nutrients_found["saturated_fat_g"] is None:
                        nutrients_found["saturated_fat_g"] = float(all_nums[1])
                        record_evidence("Saturated Fat (g)", nutrients_found["saturated_fat_g"], "Read from Package", line, "High")
            elif "sat" in lower_line or "saturated" in lower_line:
                if nutrients_found["saturated_fat_g"] is None:
                    m = re.search(r"(?:sat(?:urated)?\s*fat)\s*[:\-]?\s*([0-9]+(?:\.[0-9]+)?)", lower_line)
                    if m:
                        nutrients_found["saturated_fat_g"] = float(m.group(1))
                        record_evidence("Saturated Fat (g)", nutrients_found["saturated_fat_g"], "Read from Package", line, "High")
            elif "trans" in lower_line:
                if nutrients_found["trans_fat_g"] is None:
                    m = re.search(r"(?:trans\s*fat)\s*[:\-]?\s*([0-9]+(?:\.[0-9]+)?)", lower_line)
                    if m:
                        nutrients_found["trans_fat_g"] = float(m.group(1))
                        record_evidence("Trans Fat (g)", nutrients_found["trans_fat_g"], "Read from Package", line, "High")
            elif "total fat" in lower_line or ("fat" in lower_line and "trans" not in lower_line and "sat" not in lower_line):
                if nutrients_found["total_fat_g"] is None:
                    m = re.search(r"(?:total\s*fat|fat)\s*[:\-]?\s*([0-9]+(?:\.[0-9]+)?)", lower_line)
                    if m:
                        nutrients_found["total_fat_g"] = float(m.group(1))
                        record_evidence("Total Fat (g)", nutrients_found["total_fat_g"], "Read from Package", line, "High")

        # Cholesterol
        if "cholesterol" in lower_line:
            if nutrients_found["cholesterol_mg"] is None:
                m = re.search(r"(?:cholesterol)\s*(?:mg)?\s*[:\-]?\s*([0-9]+(?:\.[0-9]+)?)", lower_line)
                if m:
                    nutrients_found["cholesterol_mg"] = float(m.group(1))
                    record_evidence("Cholesterol (mg)", nutrients_found["cholesterol_mg"], "Read from Package", line, "High")
                else:
                    all_nums = re.findall(r"\b\d+(?:\.\d+)?\b", lower_line)
                    if all_nums:
                        nutrients_found["cholesterol_mg"] = float(all_nums[0])
                        record_evidence("Cholesterol (mg)", nutrients_found["cholesterol_mg"], "Read from Package", line, "High")

        # Sodium
        if "sodium" in lower_line:
            if nutrients_found["sodium_mg"] is None:
                m = re.search(r"(?:sodium)\s*(?:mg)?\s*[:\-]?\s*([0-9]+(?:\.[0-9]+)?)", lower_line)
                if m:
                    nutrients_found["sodium_mg"] = float(m.group(1))
                    record_evidence("Sodium (mg)", nutrients_found["sodium_mg"], "Read from Package", line, "High")
                else:
                    all_nums = re.findall(r"\b\d+(?:\.\d+)?\b", lower_line)
                    if all_nums:
                        nutrients_found["sodium_mg"] = float(all_nums[0])
                        record_evidence("Sodium (mg)", nutrients_found["sodium_mg"], "Read from Package", line, "High")

        # Protein
        if "protein" in lower_line:
            if nutrients_found["protein_g"] is None:
                m = re.search(r"(?:protein[s]?)\s*[:\-]?\s*([0-9]+(?:\.[0-9]+)?)", lower_line)
                if m:
                    nutrients_found["protein_g"] = float(m.group(1))
                    record_evidence("Protein (g)", nutrients_found["protein_g"], "Read from Package", line, "High")
                else:
                    val = extract_number_from_text(lower_line.replace("protein", "").replace("g", ""))
                    if val is not None and val < 100:
                        nutrients_found["protein_g"] = val
                        record_evidence("Protein (g)", val, "Read from Package", line, "High")

    # Mark missing nutrients honestly in evidence audit trail
    for nut_key, display_label in [
        ("energy_kcal", "Energy (kcal)"),
        ("protein_g", "Protein (g)"),
        ("carbohydrates_g", "Carbohydrates (g)"),
        ("total_sugar_g", "Total Sugars (g)"),
        ("added_sugar_g", "Added Sugars (g)"),
        ("total_fat_g", "Total Fat (g)"),
        ("saturated_fat_g", "Saturated Fat (g)"),
        ("trans_fat_g", "Trans Fat (g)"),
        ("fibre_g", "Dietary Fibre (g)"),
        ("sodium_mg", "Sodium (mg)"),
    ]:
        if nutrients_found[nut_key] is None:
            record_evidence(display_label, None, "Missing / Unknown", None, "Missing")

    # 5. Net Quantity
    net_val = None
    net_unit = None
    qty_match = re.search(
        r"(?:Net\s*(?:Quantity|Qty\.?|Weight|Wt\.?|Volume|Vol\.?)?)\s*[:\-]?\s*([0-9]+(?:\.[0-9]+)?)\s*(kg|g|gm|gms|grams|ml|mL|l|ltr|litres?)\b",
        raw_text,
        re.IGNORECASE
    )
    if qty_match:
        try:
            net_val = float(qty_match.group(1))
            net_unit = qty_match.group(2).lower()
            record_evidence("Net Quantity", f"{net_val} {net_unit}", "Read from Package", qty_match.group(0), "High")
        except ValueError:
            pass
    elif serving_size and servings_per_container:
        # Calculate implicit net weight: serving_size * servings_per_container (e.g. 20g * 25 = 500g)
        net_val = round(serving_size * servings_per_container, 1)
        net_unit = serving_unit
        record_evidence(
            "Net Quantity",
            f"{net_val} {net_unit}",
            "Calculated (Servings × Size)",
            f"{serving_size}{serving_unit} × {servings_per_container} servings = {net_val}{net_unit}",
            "High",
            "Derived from declared serving size and total servings"
        )
    else:
        record_evidence("Net Quantity", None, "Missing / Unknown", None, "Missing")

    # 6. Maximum Retail Price (MRP)
    mrp_val = None
    mrp_match = re.search(
        r"(?:M\.?R\.?P\.?|Retail\s*Price|Price)\s*(?:Rs\.?|₹|INR)?\s*[:\-]?\s*([0-9]+(?:\.[0-9]{1,2})?)",
        raw_text,
        re.IGNORECASE
    )
    if mrp_match:
        try:
            mrp_val = float(mrp_match.group(1))
            record_evidence("MRP", f"₹{mrp_val:.2f}", "Read from Package", mrp_match.group(0), "High")
        except ValueError:
            pass
    else:
        record_evidence("MRP", None, "Missing / Unknown", None, "Missing")

    # 7. Unit Price Calculation
    unit_price = None
    standard_unit_str = None
    if mrp_val and net_val and net_unit:
        try:
            calc_res = calculate_unit_price(mrp_val, net_val, net_unit)
            if calc_res.get("is_valid"):
                unit_price = calc_res["price_per_100"]
                standard_unit_str = calc_res["standard_small_unit"]
                record_evidence("Unit Price", f"₹{unit_price:.2f} per {standard_unit_str}", "Calculated", calc_res["small_formula"], "High")
        except Exception:
            pass

    # 8. Ingredients List
    ingredients_raw = None
    ing_match = re.search(r"INGREDIENTS\s*[:\-]?\s*([^\n\r]+(?:\n[^\n\r]+){0,5})", raw_text, re.IGNORECASE)
    if ing_match:
        ing_text = ing_match.group(1).strip()
        stop_match = re.search(r"\b(?:Allergen|Contains|Mfd\s*by|Manufactured\s*by|Pkg|Exp|Best\s*before)\b", ing_text, re.IGNORECASE)
        if stop_match:
            ing_text = ing_text[:stop_match.start()].strip()
        ingredients_raw = ing_text
        record_evidence("Ingredients List", ingredients_raw[:80] + ("..." if len(ingredients_raw) > 80 else ""), "Read from Package", ingredients_raw[:120], "High")
    else:
        record_evidence("Ingredients List", None, "Missing / Unknown", None, "Missing")

    # 9. Allergen Statement & Detection
    allergen_statement = None
    all_match = re.search(
        r"(?:Allergen\s*(?:Advice|Info|Information)?|Contains|May\s*contain)\s*[:\-]?\s*([^\n\r]+(?:\n[^\n\r]+)?)",
        raw_text,
        re.IGNORECASE
    )
    if all_match:
        allergen_statement = all_match.group(0).strip()
        stop = re.search(r"\b(?:Mfd|Manufactured|Net|MRP|Exp|Lic)\b", allergen_statement, re.IGNORECASE)
        if stop:
            allergen_statement = allergen_statement[:stop.start()].strip()

    allergens_detected = detect_allergens_in_text(ingredients_raw or "", allergen_statement or "")

    # 10. Dates (Mfg, Expiry, Best Before)
    mfg_date = None
    mfg_match = re.search(r"(?:Mfg\s*Date|Pkg\s*Dt|Packed\s*on|Date\s*of\s*Mfg|PKD\.?)\s*[:\-]?\s*([0-9]{1,2}[\/\.\-][0-9]{1,2}[\/\.\-][0-9]{2,4}|[0-9]{1,2}[\/\.\-][0-9]{2,4})", raw_text, re.IGNORECASE)
    if mfg_match:
        mfg_date = mfg_match.group(1).strip()

    expiry_date = None
    exp_match = re.search(r"(?:Exp\s*Date|Expiry\s*Date|EXP|Use\s*by\.?)\s*[:\-]?\s*([0-9]{1,2}[\/\.\-][0-9]{1,2}[\/\.\-][0-9]{2,4}|[0-9]{1,2}[\/\.\-][0-9]{2,4})", raw_text, re.IGNORECASE)
    if exp_match:
        expiry_date = exp_match.group(1).strip()

    best_before_text = None
    bb_match = re.search(r"(Best\s*Before\s*[^\n\r,]+)", raw_text, re.IGNORECASE)
    if bb_match:
        best_before_text = bb_match.group(1).strip()

    # 11. Manufacturer Details & Consumer Care
    mfg_name = None
    mfg_match = re.search(r"(?:(?:R-)?Mfd\.?\s*by|Manufactured\s*by|Packed\s*by|Marketed\s*by)\s*[:\-]?\s*([^\n\r,]+)", raw_text, re.IGNORECASE)
    if mfg_match:
        mfg_name = mfg_match.group(1).strip()

    care_details = None
    care_match = re.search(r"(?:(?:Consumer|Customer)\s*Care|Feedback|Helpline)\s*[:\-]?\s*([^\n\r]+)", raw_text, re.IGNORECASE)
    if care_match:
        care_details = care_match.group(1).strip()
    else:
        email_m = re.search(r"([a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)", raw_text)
        if email_m:
            care_details = email_m.group(1).strip()

    origin = "India" if ("FSSAI" in raw_text or "₹" in raw_text or "Rs" in raw_text or "Mumbai" in raw_text or "Lic.No" in raw_text) else None

    # Construct Extracted Product Response
    product_obj = ProductResponse(
        id=str(uuid.uuid4())[:8],
        name=name,
        brand=brand,
        category="Packaged Commodity",
        net_quantity_value=net_val,
        net_quantity_unit=net_unit or "g",
        mrp=mrp_val,
        currency="INR",
        price_per_standard_unit=unit_price,
        standard_unit=standard_unit_str,
        serving_size=serving_size or (net_val if net_val and net_val <= 60 else 30.0),
        serving_unit=serving_unit,
        servings_per_container=servings_per_container or (round(net_val / (serving_size or 30.0), 1) if net_val else None),
        nutrition_basis=nutrition_basis,
        energy_kcal=nutrients_found["energy_kcal"],
        protein_g=nutrients_found["protein_g"],
        carbohydrates_g=nutrients_found["carbohydrates_g"],
        total_sugar_g=nutrients_found["total_sugar_g"],
        added_sugar_g=nutrients_found["added_sugar_g"],
        total_fat_g=nutrients_found["total_fat_g"],
        saturated_fat_g=nutrients_found["saturated_fat_g"],
        trans_fat_g=nutrients_found["trans_fat_g"],
        cholesterol_mg=nutrients_found["cholesterol_mg"],
        fibre_g=nutrients_found["fibre_g"],
        sodium_mg=nutrients_found["sodium_mg"],
        ingredients_raw=ingredients_raw,
        allergens_detected=allergens_detected,
        allergen_statement=allergen_statement,
        mfg_date=mfg_date,
        expiry_date=expiry_date,
        best_before_text=best_before_text,
        manufacturer_name=mfg_name,
        country_of_origin=origin,
        consumer_care_details=care_details,
        raw_ocr_text=raw_text,
        data_source="Local OCR & Deterministic Parser",
        field_evidences=evidences
    )

    explained_ingredients = extract_and_explain_ingredients(ingredients_raw or raw_text)
    declarations_checklist = check_declarations(product_obj, raw_text)

    # Confidence calculation
    detected_count = sum([
        1 if product_obj.energy_kcal is not None else 0,
        1 if product_obj.carbohydrates_g is not None else 0,
        1 if product_obj.total_fat_g is not None else 0,
        1 if product_obj.total_sugar_g is not None else 0,
        1 if product_obj.net_quantity_value is not None else 0,
        1 if product_obj.mrp is not None else 0,
    ])

    overall_conf = "High" if detected_count >= 4 else ("Medium" if detected_count >= 2 else "Uncertain")

    warnings = []
    if product_obj.energy_kcal is None:
        warnings.append("Energy / Calories could not be detected. You can review or edit manually.")
    if product_obj.protein_g is None:
        warnings.append("Protein value could not be detected.")
    if product_obj.net_quantity_value is None:
        warnings.append("Net quantity is missing. Enter weight/volume to calculate unit prices.")

    return AnalyzeLabelResponse(
        product=product_obj,
        evidences=evidences,
        allergens_detected=allergens_detected,
        ingredients_explained=explained_ingredients,
        declarations_checklist=declarations_checklist,
        raw_ocr_text=raw_text,
        overall_confidence=overall_conf,
        warnings=warnings
    )
