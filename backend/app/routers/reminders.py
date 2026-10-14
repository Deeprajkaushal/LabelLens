import sqlite3
import uuid
from datetime import date, datetime
from typing import List, Optional
from fastapi import APIRouter, HTTPException
from app.db import get_connection
from app.models.schemas import ReminderCreate, ReminderUpdate, ReminderResponse

router = APIRouter(prefix="/api/reminders", tags=["Expiry Reminders"])

def _calculate_days_left(expiry_date_str: str) -> int:
    try:
        # Support YYYY-MM-DD or DD/MM/YYYY
        if "-" in expiry_date_str:
            parts = [int(p) for p in expiry_date_str.split("-")]
            if len(parts) == 3:
                exp_d = date(parts[0], parts[1], parts[2])
                return (exp_d - date.today()).days
        elif "/" in expiry_date_str:
            parts = [int(p) for p in expiry_date_str.split("/")]
            if len(parts) == 3:
                # DD/MM/YYYY
                exp_d = date(parts[2], parts[1], parts[0])
                return (exp_d - date.today()).days
    except Exception:
        pass
    return 0

def _row_to_reminder(row: sqlite3.Row) -> ReminderResponse:
    d = dict(row)
    days_left = _calculate_days_left(d["expiry_date"])
    return ReminderResponse(
        id=d["id"],
        product_id=d.get("product_id"),
        product_name=d["product_name"],
        reminder_date=d["reminder_date"],
        expiry_date=d["expiry_date"],
        reminder_type=d.get("reminder_type") or "Expiry",
        status=d.get("status") or "Active",
        days_left=days_left,
        notes=d.get("notes"),
        created_at=d.get("created_at") or ""
    )

@router.get("", response_model=List[ReminderResponse])
def list_reminders(status: Optional[str] = None):
    conn = get_connection()
    cursor = conn.cursor()
    query = "SELECT * FROM reminders"
    params = []

    if status:
        query += " WHERE status = ?"
        params.append(status)

    query += " ORDER BY expiry_date ASC"
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    return [_row_to_reminder(r) for r in rows]

@router.post("", response_model=ReminderResponse, status_code=201)
def create_reminder(rem: ReminderCreate):
    conn = get_connection()
    cursor = conn.cursor()
    rem_id = str(uuid.uuid4())[:8]

    cursor.execute("""
        INSERT INTO reminders (
            id, product_id, product_name, reminder_date, expiry_date, reminder_type, status, notes
        ) VALUES (?, ?, ?, ?, ?, ?, 'Active', ?)
    """, (
        rem_id, rem.product_id, rem.product_name, rem.reminder_date, rem.expiry_date,
        rem.reminder_type, rem.notes
    ))
    conn.commit()

    cursor.execute("SELECT * FROM reminders WHERE id = ?", (rem_id,))
    row = cursor.fetchone()
    conn.close()
    return _row_to_reminder(row)

@router.put("/{reminder_id}", response_model=ReminderResponse)
def update_reminder(reminder_id: str, updates: ReminderUpdate):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM reminders WHERE id = ?", (reminder_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail=f"Reminder with ID '{reminder_id}' not found.")

    fields = []
    values = []
    up_dict = updates.model_dump(exclude_unset=True)

    for k, v in up_dict.items():
        fields.append(f"{k} = ?")
        values.append(v)

    if fields:
        sql = f"UPDATE reminders SET {', '.join(fields)} WHERE id = ?"
        values.append(reminder_id)
        cursor.execute(sql, values)
        conn.commit()

    cursor.execute("SELECT * FROM reminders WHERE id = ?", (reminder_id,))
    updated_row = cursor.fetchone()
    conn.close()
    return _row_to_reminder(updated_row)

@router.delete("/{reminder_id}")
def delete_reminder(reminder_id: str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM reminders WHERE id = ?", (reminder_id,))
    deleted = cursor.rowcount > 0
    conn.commit()
    conn.close()
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Reminder with ID '{reminder_id}' not found.")
    return {"success": True, "message": f"Reminder '{reminder_id}' deleted."}
