from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Query
from typing import List, Optional
from app.models.schemas import (
    AnalyzeLabelRequest,
    AnalyzeLabelResponse,
    PortionCalculateRequest,
    PortionCalculateResponse
)
from app.services.parser import parse_label_text
from app.services.nutrition import calculate_portion_calories
from app.services.openfoodfacts import lookup_barcode
from app.services.ocr_engine import process_multiple_images_ocr

router = APIRouter(prefix="/api", tags=["Label & OCR Scanning"])

MAX_IMAGE_SIZE = 15 * 1024 * 1024  # 15 MB per image
ALLOWED_MIME_PREFIXES = ["image/jpeg", "image/png", "image/webp", "image/bmp", "image/tiff"]

@router.post("/scan", response_model=AnalyzeLabelResponse)
async def scan_label_images(
    files: List[UploadFile] = File(..., description="One or more package label images (front, back, etc.)"),
    language: str = Form("en")
):
    """
    Primary local image OCR endpoint.
    Accepts one or more label photographs (JPEG, PNG, WEBP), performs orientation correction,
    local RapidOCR text recognition, spatial table line reconstruction, and deterministic parsing.
    Returns structured product information with field-level evidence.
    """
    if not files:
        raise HTTPException(status_code=400, detail="At least one image file is required.")

    images_data = []
    for file in files:
        # Check mime type where provided
        if file.content_type and not any(file.content_type.startswith(prefix) for prefix in ALLOWED_MIME_PREFIXES):
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file format '{file.content_type}' for {file.filename}. Please upload JPG, PNG, or WEBP images."
            )

        content = await file.read()
        if len(content) == 0:
            raise HTTPException(status_code=400, detail=f"File '{file.filename}' is empty.")
        if len(content) > MAX_IMAGE_SIZE:
            raise HTTPException(status_code=400, detail=f"File '{file.filename}' exceeds 15MB size limit.")

        images_data.append((file.filename or "image.jpg", content))

    # Run Local OCR
    try:
        ocr_result = process_multiple_images_ocr(images_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal OCR error: {str(e)}")

    if not ocr_result["success"] or not ocr_result["raw_text"].strip():
        raise HTTPException(
            status_code=422,
            detail={
                "code": "OCR_NO_TEXT_DETECTED",
                "message": ocr_result.get("message", "No readable text detected on the uploaded image(s)."),
                "recovery_guidance": "Ensure label is well-lit, not blurry, and the nutrition table is clearly in frame. You can also crop the photo or type the details manually."
            }
        )

    # Deterministic Parsing
    parsed_response = parse_label_text(ocr_result["raw_text"])

    # Update overall confidence from OCR if available
    if ocr_result.get("confidence", 0) > 0.65 and parsed_response.overall_confidence == "Medium":
        parsed_response.overall_confidence = "High"

    return parsed_response

@router.post("/analyze-label", response_model=AnalyzeLabelResponse)
def analyze_label(req: AnalyzeLabelRequest):
    """
    Analyzes raw OCR text directly.
    Runs 100% locally and deterministically.
    """
    if not req.raw_text or not req.raw_text.strip():
        raise HTTPException(status_code=400, detail="Label text cannot be empty. Please provide recognized OCR text.")

    result = parse_label_text(req.raw_text)
    return result

@router.post("/calculate-portion", response_model=PortionCalculateResponse)
def calculate_portion(req: PortionCalculateRequest):
    """
    Calculates calories and macronutrients for any custom portion size.
    """
    try:
        nutrients_dict = {
            "protein_g": req.protein_g,
            "carbohydrates_g": req.carbohydrates_g,
            "total_sugar_g": req.total_sugar_g,
            "total_fat_g": req.total_fat_g,
            "saturated_fat_g": req.saturated_fat_g,
            "sodium_mg": req.sodium_mg,
            "fibre_g": req.fibre_g,
        }
        res = calculate_portion_calories(
            energy_kcal_basis=req.energy_kcal_basis,
            basis=req.basis,
            basis_quantity=req.basis_quantity,
            portion_size=req.portion_size,
            portion_unit=req.portion_unit,
            nutrients_dict=nutrients_dict
        )
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/barcode/{code}")
def get_barcode_product(code: str):
    """
    Cached Open Food Facts lookup. Gracefully returns not found if offline or unknown.
    """
    res = lookup_barcode(code)
    if not res:
        return {"found": False, "message": "Product not found in database or offline mode active."}
    return res
