import sqlite3
import json
import uuid
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
from app.db import get_connection
from app.models.schemas import ProductResponse, ProductCreate, ProductUpdate, AllergenMatch
from app.services.declaration_checker import check_declarations

router = APIRouter(prefix="/api/products", tags=["Products"])

def _row_to_product(row: sqlite3.Row) -> ProductResponse:
    d = dict(row)
    allergens = []
    if d.get("allergens_detected_json"):
        try:
            raw_all = json.loads(d["allergens_detected_json"])
            allergens = [AllergenMatch(**item) for item in raw_all]
        except Exception:
            allergens = []

    return ProductResponse(
        id=d["id"],
        name=d["name"],
        brand=d.get("brand"),
        category=d.get("category"),
        net_quantity_value=d.get("net_quantity_value"),
        net_quantity_unit=d.get("net_quantity_unit"),
        mrp=d.get("mrp"),
        currency=d.get("currency") or "INR",
        price_per_standard_unit=d.get("price_per_standard_unit"),
        standard_unit=d.get("standard_unit"),
        serving_size=d.get("serving_size"),
        serving_unit=d.get("serving_unit"),
        servings_per_container=d.get("servings_per_container"),
        nutrition_basis=d.get("nutrition_basis") or "per 100g",
        energy_kcal=d.get("energy_kcal"),
        protein_g=d.get("protein_g"),
        carbohydrates_g=d.get("carbohydrates_g"),
        total_sugar_g=d.get("total_sugar_g"),
        added_sugar_g=d.get("added_sugar_g"),
        total_fat_g=d.get("total_fat_g"),
        saturated_fat_g=d.get("saturated_fat_g"),
        trans_fat_g=d.get("trans_fat_g"),
        cholesterol_mg=d.get("cholesterol_mg"),
        fibre_g=d.get("fibre_g"),
        sodium_mg=d.get("sodium_mg"),
        ingredients_raw=d.get("ingredients_raw"),
        allergens_detected=allergens,
        allergen_statement=d.get("allergen_statement"),
        mfg_date=d.get("mfg_date"),
        expiry_date=d.get("expiry_date"),
        best_before_text=d.get("best_before_text"),
        manufacturer_name=d.get("manufacturer_name"),
        manufacturer_address=d.get("manufacturer_address"),
        country_of_origin=d.get("country_of_origin"),
        consumer_care_details=d.get("consumer_care_details"),
        raw_ocr_text=d.get("raw_ocr_text"),
        data_source=d.get("data_source") or "Manual / OCR",
        is_favorite=bool(d.get("is_favorite")),
        is_demo=bool(d.get("is_demo")),
        created_at=d.get("created_at"),
        updated_at=d.get("updated_at")
    )

@router.get("", response_model=List[ProductResponse])
def list_products(
    q: Optional[str] = None,
    favorite_only: bool = False,
    limit: int = 50
):
    conn = get_connection()
    cursor = conn.cursor()
    query = "SELECT * FROM products WHERE 1=1"
    params = []

    if q:
        query += " AND (name LIKE ? OR brand LIKE ? OR category LIKE ?)"
        term = f"%{q.strip()}%"
        params.extend([term, term, term])

    if favorite_only:
        query += " AND is_favorite = 1"

    query += " ORDER BY created_at DESC LIMIT ?"
    params.append(limit)

    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    return [_row_to_product(r) for r in rows]

@router.post("", response_model=ProductResponse, status_code=201)
def create_product(product: ProductCreate):
    conn = get_connection()
    cursor = conn.cursor()
    prod_id = product.id or str(uuid.uuid4())[:8]

    allergens_json = json.dumps([a.model_dump() for a in product.allergens_detected])

    cursor.execute("""
        INSERT INTO products (
            id, name, brand, category, net_quantity_value, net_quantity_unit,
            mrp, currency, price_per_standard_unit, standard_unit,
            serving_size, serving_unit, servings_per_container, nutrition_basis,
            energy_kcal, protein_g, carbohydrates_g, total_sugar_g, added_sugar_g,
            total_fat_g, saturated_fat_g, trans_fat_g, cholesterol_mg, fibre_g, sodium_mg,
            ingredients_raw, allergens_detected_json, allergen_statement,
            mfg_date, expiry_date, best_before_text,
            manufacturer_name, manufacturer_address, country_of_origin, consumer_care_details,
            raw_ocr_text, data_source, is_favorite, is_demo
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        prod_id, product.name, product.brand, product.category,
        product.net_quantity_value, product.net_quantity_unit,
        product.mrp, product.currency,
        product.price_per_standard_unit, product.standard_unit,
        product.serving_size, product.serving_unit, product.servings_per_container,
        product.nutrition_basis,
        product.energy_kcal, product.protein_g, product.carbohydrates_g,
        product.total_sugar_g, product.added_sugar_g,
        product.total_fat_g, product.saturated_fat_g, product.trans_fat_g,
        product.cholesterol_mg, product.fibre_g, product.sodium_mg,
        product.ingredients_raw, allergens_json, product.allergen_statement,
        product.mfg_date, product.expiry_date, product.best_before_text,
        product.manufacturer_name, product.manufacturer_address,
        product.country_of_origin, product.consumer_care_details,
        product.raw_ocr_text, product.data_source,
        1 if product.is_favorite else 0,
        1 if product.is_demo else 0
    ))
    conn.commit()

    cursor.execute("SELECT * FROM products WHERE id = ?", (prod_id,))
    row = cursor.fetchone()
    conn.close()
    return _row_to_product(row)

@router.get("/{product_id}", response_model=ProductResponse)
def get_product(product_id: str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM products WHERE id = ?", (product_id,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail=f"Product with ID '{product_id}' not found.")
    return _row_to_product(row)

@router.put("/{product_id}", response_model=ProductResponse)
def update_product(product_id: str, updates: ProductUpdate):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM products WHERE id = ?", (product_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail=f"Product with ID '{product_id}' not found.")

    fields = []
    values = []
    up_dict = updates.model_dump(exclude_unset=True)

    for k, v in up_dict.items():
        if k == "allergens_detected":
            fields.append("allergens_detected_json = ?")
            values.append(json.dumps([a.dict() if hasattr(a, 'dict') else a for a in (v or [])]))
        elif k == "is_favorite":
            fields.append("is_favorite = ?")
            values.append(1 if v else 0)
        else:
            fields.append(f"{k} = ?")
            values.append(v)

    if fields:
        fields.append("updated_at = CURRENT_TIMESTAMP")
        sql = f"UPDATE products SET {', '.join(fields)} WHERE id = ?"
        values.append(product_id)
        cursor.execute(sql, values)
        conn.commit()

    cursor.execute("SELECT * FROM products WHERE id = ?", (product_id,))
    updated_row = cursor.fetchone()
    conn.close()
    return _row_to_product(updated_row)

@router.delete("/{product_id}")
def delete_product(product_id: str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM products WHERE id = ?", (product_id,))
    deleted = cursor.rowcount > 0
    conn.commit()
    conn.close()
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Product with ID '{product_id}' not found.")
    return {"success": True, "message": f"Product '{product_id}' deleted successfully."}

@router.post("/{product_id}/favorite")
def toggle_favorite(product_id: str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT is_favorite FROM products WHERE id = ?", (product_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail=f"Product with ID '{product_id}' not found.")
    
    current = row["is_favorite"]
    new_val = 0 if current else 1
    cursor.execute("UPDATE products SET is_favorite = ? WHERE id = ?", (new_val, product_id))
    conn.commit()
    conn.close()
    return {"product_id": product_id, "is_favorite": bool(new_val)}
