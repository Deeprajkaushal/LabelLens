# LabelLens — AI-Light, Local-First Consumer Product Intelligence Platform

> **Scan. Understand. Compare.**
> A consumer-facing packaged food intelligence web application built for the Tech Expo.

---

## 🌟 Overview & Product Vision

**LabelLens** helps everyday consumers decode packaged food labels without relying on expensive, black-box cloud AI APIs:

1. **Smart Calorie & Nutrition Calculator**: Calculates exact calories and macronutrients for any custom portion size using transparent formulas.
2. **Ingredient & Additive Explainer**: Explains E-numbers, INS codes, preservatives, emulsifiers, and sweeteners with plain-language English and Hindi definitions from a curated local JSON database.
3. **Allergen & Preference Alerts**: Detects declared allergens (Milk, Peanuts, Tree Nuts, Soy, Wheat/Gluten, Egg, Fish, Sesame, Mustard, etc.) and presents exact verbatim snippets from the packaging label as proof.
4. **Value-for-Money Checker**: Computes price per 100 g / 100 ml and price per 1 kg / 1 L with full formula transparency.
5. **Fair Product Comparison**: Side-by-side normalized nutritional and unit price comparison with compatibility safeguards between solids (g) and liquids (ml).
6. **Daily Food Log & Calorie Tracker**: Logs portions eaten with automatic calorie calculations and daily totals without unsolicited medical advice.
7. **Pantry Expiry & Best-Before Reminders**: Tracks shelf life with dynamic days-left countdowns.
8. **Evidence & Trust Panel**: Honest audit trail showing whether each field was read from the package, calculated by formula, or is missing.
9. **Legal Metrology Packaging Checklist**: Evaluates mandatory declarations (Product Name, Net Quantity, MRP, Dates, Manufacturer details, Country of Origin, Consumer Care).
10. **Bilingual Support (English & Hindi)**: Instant local toggle across all navigation, terminology, and explanations.

---

## 🏗️ Architecture & Technology Stack

LabelLens is designed as a **local-first, deterministic platform**:

- **Frontend**:
  - React 18, TypeScript, Vite
  - Custom CSS Design System (Outfit & Plus Jakarta Sans typography, glassmorphism cards, responsive dark theme)
  - Browser-side OCR via **Tesseract.js** (supports live camera feed + file upload)
  - Lucide React iconography
- **Backend**:
  - Python 3.10+ / FastAPI / Uvicorn
  - Pydantic v2 schemas and validation
  - SQLite database for persistent products, food log entries, and reminders
  - Deterministic Regex & Rule-based label text parser
  - Automated tests with **pytest**
- **Optional Generative AI Policy**:
  - Disabled by default (`LABELLENS_ENABLE_GEMINI=false`).
  - Never required for startup, local scanning, portion math, unit pricing, or comparisons.

---

## 📁 Project Structure

```
LabelLens/
├── backend/
│   ├── app/
│   │   ├── config.py              # Configurable DB path, CORS, optional AI flag
│   │   ├── db.py                  # SQLite persistence & demo data seeder
│   │   ├── main.py                # FastAPI app, CORS, lifespan, routes
│   │   ├── models/
│   │   │   └── schemas.py         # Pydantic models (Products, Calculations, Food Log, Reminders)
│   │   ├── routers/
│   │   │   ├── label.py           # POST /api/analyze-label, POST /api/calculate-portion, /api/barcode
│   │   │   ├── products.py        # CRUD /api/products
│   │   │   ├── compare.py         # POST /api/compare
│   │   │   ├── food_log.py        # CRUD /api/food-log
│   │   │   ├── reminders.py       # CRUD /api/reminders
│   │   │   └── ingredients.py     # GET /api/ingredients/search, /api/ingredients/demo-products
│   │   ├── services/
│   │   │   ├── parser.py          # Deterministic label text parser & evidence extractor
│   │   │   ├── nutrition.py       # Portion calories & macronutrients calculator
│   │   │   ├── value_checker.py   # Price per 100g/ml/kg/L calculator
│   │   │   ├── comparator.py      # Normalized side-by-side comparison engine
│   │   │   ├── allergens.py       # Exact snippet matching for allergens
│   │   │   ├── ingredient_db.py   # Curated local JSON ingredients lookup
│   │   │   ├── declaration_checker.py # Legal Metrology consumer checklist
│   │   │   └── optional_gemini.py # Disabled-by-default fallback
│   │   └── data/
│   │       ├── ingredients_db.json # Curated additives database with Hindi/English
│   │       └── demo_products.json  # 3 rich Tech Expo demonstration products
│   ├── tests/                     # 28 passing automated pytest tests
│   │   ├── test_nutrition.py
│   │   ├── test_value_checker.py
│   │   ├── test_comparator.py
│   │   ├── test_allergens.py
│   │   ├── test_ingredient_db.py
│   │   ├── test_parser.py
│   │   └── test_api_routes.py
│   ├── requirements.txt
│   └── run.py
│
├── frontend/
│   ├── src/
│   │   ├── components/            # Reusable UI components
│   │   │   ├── Navbar.tsx
│   │   │   ├── CameraCapture.tsx  # Device camera stream & upload
│   │   │   ├── PortionSlider.tsx  # Interactive live portion math
│   │   │   ├── ValueCard.tsx      # Unit price & formula breakdown
│   │   │   ├── AllergenAlerts.tsx # Snippet evidence badges
│   │   │   ├── DeclarationChecklist.tsx # Legal Metrology checklist
│   │   │   └── EvidenceBadge.tsx  # Honest provenance pills
│   │   ├── views/                 # 10 Application Screens
│   │   │   ├── HomeDashboard.tsx
│   │   │   ├── ScanView.tsx
│   │   │   ├── ScanResultsView.tsx
│   │   │   ├── NutritionCalcView.tsx
│   │   │   ├── ComparisonView.tsx
│   │   │   ├── IngredientExplorerView.tsx
│   │   │   ├── FoodLogView.tsx
│   │   │   ├── RemindersView.tsx
│   │   │   ├── SavedProductsView.tsx
│   │   │   └── SettingsView.tsx
│   │   ├── i18n/                  # English & Hindi dictionaries
│   │   ├── services/              # API client, Tesseract.js OCR, local storage
│   │   ├── types/                 # TypeScript interfaces
│   │   ├── index.css              # Custom design system
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
└── README.md
```

---

## 🚀 Step-by-Step Local Run Instructions

### 1. Prerequisites
- Python 3.10+ (tested on Python 3.14.2)
- Node.js v18+ (tested on Node v24.19.0)
- npm 9+ (tested on npm 11.17.0)

---

### 2. Backend Setup & Run

Open a terminal in `LabelLens/backend`:

```bash
# 1. Navigate to backend directory
cd LabelLens/backend

# 2. (Optional) Create & activate a virtual environment
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Run automated test suite (28 tests)
python -m pytest tests

# 5. Start the FastAPI backend server
python run.py
```
*Backend is now running at:* **`http://127.0.0.1:8000`**  
*Interactive Swagger API Docs available at:* **`http://127.0.0.1:8000/docs`**  
*Health check:* **`http://127.0.0.1:8000/health`**

---

### 3. Frontend Setup & Run

Open a second terminal in `LabelLens/frontend`:

```bash
# 1. Navigate to frontend directory
cd LabelLens/frontend

# 2. Install npm dependencies
npm install

# 3. Start the Vite development server
npm run dev
```
*Frontend is now running at:* **`http://localhost:5173`**

---

## 🧪 Automated Test Results

Run all 28 automated tests anytime with:
```bash
python -m pytest LabelLens/backend/tests
```
**Results:** `28 passed in 0.59s`
- `test_allergens.py`: Declared ingredients, precautionary cross-contact statements, negative cases.
- `test_api_routes.py`: Health endpoint, `/api/analyze-label`, portion math, product CRUD, food log CRUD, reminder CRUD.
- `test_comparator.py`: Fair side-by-side nutrition differences, liquid vs solid compatibility checks, missing field safety.
- `test_ingredient_db.py`: Query by INS code, name, category, Hindi translation mappings.
- `test_nutrition.py`: Standard 100g conversion, millilitre liquids, kilogram units, invalid negative inputs.
- `test_parser.py`: Known sample label text parsing, date extraction, missing value safety.
- `test_value_checker.py`: Price per 100g, price per 1kg, price per 100ml, price per 1L, zero/negative rejection.

---

## 🔒 Privacy & Local-First Verification

- **No Remote AI Dependencies**: All scanning, OCR, formulas, comparisons, and ingredient queries run locally.
- **Zero Cloud Leakage**: Images remain within the browser during OCR recognition.
- **Standalone Project**: Completely decoupled from LegalCheck; zero git remotes configured; nothing pushed to GitHub.
