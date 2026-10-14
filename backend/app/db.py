import sqlite3
import json
import os
from pathlib import Path
from typing import Dict, Any, List, Optional
from app.config import DATABASE_PATH, BASE_DIR

def get_connection() -> sqlite3.Connection:
    os.makedirs(os.path.dirname(DATABASE_PATH), exist_ok=True)
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()

    # Products table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        brand TEXT,
        category TEXT,
        net_quantity_value REAL,
        net_quantity_unit TEXT,
        mrp REAL,
        currency TEXT DEFAULT 'INR',
        price_per_standard_unit REAL,
        standard_unit TEXT,
        serving_size REAL,
        serving_unit TEXT,
        servings_per_container REAL,
        nutrition_basis TEXT DEFAULT 'per 100g',
        energy_kcal REAL,
        protein_g REAL,
        carbohydrates_g REAL,
        total_sugar_g REAL,
        added_sugar_g REAL,
        total_fat_g REAL,
        saturated_fat_g REAL,
        trans_fat_g REAL,
        cholesterol_mg REAL,
        fibre_g REAL,
        sodium_mg REAL,
        ingredients_raw TEXT,
        allergens_detected_json TEXT DEFAULT '[]',
        allergen_statement TEXT,
        mfg_date TEXT,
        expiry_date TEXT,
        best_before_text TEXT,
        manufacturer_name TEXT,
        manufacturer_address TEXT,
        country_of_origin TEXT,
        consumer_care_details TEXT,
        raw_ocr_text TEXT,
        data_source TEXT DEFAULT 'Manual / OCR',
        is_favorite INTEGER DEFAULT 0,
        is_demo INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # Food Log table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS food_log (
        id TEXT PRIMARY KEY,
        product_id TEXT,
        product_name TEXT NOT NULL,
        log_date TEXT NOT NULL,
        meal_type TEXT DEFAULT 'Snack',
        portion_size REAL NOT NULL,
        portion_unit TEXT NOT NULL,
        calories_consumed REAL NOT NULL,
        protein_g REAL,
        carbs_g REAL,
        fat_g REAL,
        sugar_g REAL,
        sodium_mg REAL,
        notes TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # Reminders table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS reminders (
        id TEXT PRIMARY KEY,
        product_id TEXT,
        product_name TEXT NOT NULL,
        reminder_date TEXT NOT NULL,
        expiry_date TEXT NOT NULL,
        reminder_type TEXT DEFAULT 'Expiry',
        status TEXT DEFAULT 'Active',
        notes TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    """)

    conn.commit()

    # Seed demo products if empty
    cursor.execute("SELECT COUNT(*) as count FROM products WHERE is_demo = 1")
    count = cursor.fetchone()["count"]
    if count == 0:
        seed_demo_data(conn)

    conn.close()

def seed_demo_data(conn: sqlite3.Connection):
    demo_file = BASE_DIR / "data" / "demo_products.json"
    if not demo_file.exists():
        return
    try:
        with open(demo_file, "r", encoding="utf-8") as f:
            demo_products = json.load(f)
        cursor = conn.cursor()
        for p in demo_products:
            cursor.execute("""
                INSERT OR REPLACE INTO products (
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
                p["id"], p["name"], p.get("brand"), p.get("category"),
                p.get("net_quantity_value"), p.get("net_quantity_unit"),
                p.get("mrp"), p.get("currency", "INR"),
                p.get("price_per_standard_unit"), p.get("standard_unit"),
                p.get("serving_size"), p.get("serving_unit"), p.get("servings_per_container"),
                p.get("nutrition_basis", "per 100g"),
                p.get("energy_kcal"), p.get("protein_g"), p.get("carbohydrates_g"),
                p.get("total_sugar_g"), p.get("added_sugar_g"),
                p.get("total_fat_g"), p.get("saturated_fat_g"), p.get("trans_fat_g"),
                p.get("cholesterol_mg"), p.get("fibre_g"), p.get("sodium_mg"),
                p.get("ingredients_raw"), json.dumps(p.get("allergens_detected", [])),
                p.get("allergen_statement"),
                p.get("mfg_date"), p.get("expiry_date"), p.get("best_before_text"),
                p.get("manufacturer_name"), p.get("manufacturer_address"),
                p.get("country_of_origin"), p.get("consumer_care_details"),
                p.get("raw_ocr_text"), "Demo Data", 0, 1
            ))
        conn.commit()
    except Exception as e:
        print(f"Error seeding demo products: {e}")
