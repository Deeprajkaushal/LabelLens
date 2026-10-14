import sqlite3
import uuid
from datetime import date
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
from app.db import get_connection
from app.models.schemas import (
    FoodLogCreate,
    FoodLogUpdate,
    FoodLogResponse,
    DailyFoodLogSummary
)

router = APIRouter(prefix="/api/food-log", tags=["Daily Food Log"])

def _row_to_entry(row: sqlite3.Row) -> FoodLogResponse:
    d = dict(row)
    return FoodLogResponse(
        id=d["id"],
        product_id=d.get("product_id"),
        product_name=d["product_name"],
        log_date=d["log_date"],
        meal_type=d.get("meal_type") or "Snack",
        portion_size=d["portion_size"],
        portion_unit=d["portion_unit"],
        calories_consumed=d["calories_consumed"],
        protein_g=d.get("protein_g"),
        carbs_g=d.get("carbs_g"),
        fat_g=d.get("fat_g"),
        sugar_g=d.get("sugar_g"),
        sodium_mg=d.get("sodium_mg"),
        notes=d.get("notes"),
        created_at=d.get("created_at") or ""
    )

@router.get("", response_model=DailyFoodLogSummary)
def get_daily_food_log(log_date: Optional[str] = None):
    target_date = log_date or str(date.today())
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT * FROM food_log
        WHERE log_date = ?
        ORDER BY created_at ASC
    """, (target_date,))
    rows = cursor.fetchall()
    conn.close()

    entries = [_row_to_entry(r) for r in rows]

    total_cal = round(sum(e.calories_consumed for e in entries), 1)
    total_prot = round(sum(e.protein_g or 0 for e in entries), 1)
    total_carbs = round(sum(e.carbs_g or 0 for e in entries), 1)
    total_fat = round(sum(e.fat_g or 0 for e in entries), 1)
    total_sugar = round(sum(e.sugar_g or 0 for e in entries), 1)
    total_sodium = round(sum(e.sodium_mg or 0 for e in entries), 1)

    return DailyFoodLogSummary(
        log_date=target_date,
        total_calories=total_cal,
        total_protein_g=total_prot,
        total_carbs_g=total_carbs,
        total_fat_g=total_fat,
        total_sugar_g=total_sugar,
        total_sodium_mg=total_sodium,
        entries_count=len(entries),
        entries=entries
    )

@router.post("", response_model=FoodLogResponse, status_code=201)
def add_food_log_entry(entry: FoodLogCreate):
    conn = get_connection()
    cursor = conn.cursor()
    entry_id = str(uuid.uuid4())[:8]

    cursor.execute("""
        INSERT INTO food_log (
            id, product_id, product_name, log_date, meal_type,
            portion_size, portion_unit, calories_consumed,
            protein_g, carbs_g, fat_g, sugar_g, sodium_mg, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        entry_id, entry.product_id, entry.product_name, entry.log_date, entry.meal_type,
        entry.portion_size, entry.portion_unit, entry.calories_consumed,
        entry.protein_g, entry.carbs_g, entry.fat_g, entry.sugar_g, entry.sodium_mg, entry.notes
    ))
    conn.commit()

    cursor.execute("SELECT * FROM food_log WHERE id = ?", (entry_id,))
    row = cursor.fetchone()
    conn.close()
    return _row_to_entry(row)

@router.put("/{entry_id}", response_model=FoodLogResponse)
def update_food_log_entry(entry_id: str, updates: FoodLogUpdate):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM food_log WHERE id = ?", (entry_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail=f"Log entry with ID '{entry_id}' not found.")

    fields = []
    values = []
    up_dict = updates.dict(exclude_unset=True)

    for k, v in up_dict.items():
        fields.append(f"{k} = ?")
        values.append(v)

    if fields:
        sql = f"UPDATE food_log SET {', '.join(fields)} WHERE id = ?"
        values.append(entry_id)
        cursor.execute(sql, values)
        conn.commit()

    cursor.execute("SELECT * FROM food_log WHERE id = ?", (entry_id,))
    updated_row = cursor.fetchone()
    conn.close()
    return _row_to_entry(updated_row)

@router.delete("/{entry_id}")
def delete_food_log_entry(entry_id: str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM food_log WHERE id = ?", (entry_id,))
    deleted = cursor.rowcount > 0
    conn.commit()
    conn.close()
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Log entry with ID '{entry_id}' not found.")
    return {"success": True, "message": f"Log entry '{entry_id}' deleted."}
