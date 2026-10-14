import sqlite3
import json
from fastapi import APIRouter, HTTPException
from app.db import get_connection
from app.models.schemas import CompareProductsRequest, ProductCompareResponse, ProductBase, AllergenMatch
from app.services.comparator import compare_products_logic

router = APIRouter(prefix="/api/compare", tags=["Product Comparison"])

def _fetch_product_by_id(conn: sqlite3.Connection, prod_id: str) -> ProductBase:
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM products WHERE id = ?", (prod_id,))
    row = cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail=f"Product with ID '{prod_id}' not found.")
    d = dict(row)
    return ProductBase(**d)

@router.post("", response_model=ProductCompareResponse)
def compare_products(req: CompareProductsRequest):
    """
    Compares two products side-by-side using code, not generative AI.
    Normalizes units, calculates differences, and produces consumer takeaways.
    """
    conn = get_connection()
    try:
        prod_a = req.product_a
        prod_b = req.product_b

        if not prod_a and req.product_a_id:
            prod_a = _fetch_product_by_id(conn, req.product_a_id)

        if not prod_b and req.product_b_id:
            prod_b = _fetch_product_by_id(conn, req.product_b_id)

        if not prod_a or not prod_b:
            raise HTTPException(
                status_code=400,
                detail="Both Product A and Product B must be specified (via ID or product payload)."
            )

        return compare_products_logic(prod_a, prod_b)
    finally:
        conn.close()
