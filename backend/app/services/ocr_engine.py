import io
import logging
from typing import List, Dict, Any, Tuple, Optional
import numpy as np
from PIL import Image, ImageOps
import cv2
from rapidocr_onnxruntime import RapidOCR

logger = logging.getLogger(__name__)

# Initialize RapidOCR singleton
_OCR_ENGINE: Optional[RapidOCR] = None

def get_ocr_engine() -> RapidOCR:
    global _OCR_ENGINE
    if _OCR_ENGINE is None:
        _OCR_ENGINE = RapidOCR()
    return _OCR_ENGINE

def correct_image_orientation(image: Image.Image) -> Image.Image:
    """Corrects EXIF orientation so mobile photographs are oriented right side up."""
    try:
        return ImageOps.exif_transpose(image)
    except Exception:
        return image

def pil_to_cv2(image: Image.Image) -> np.ndarray:
    """Converts a PIL image to OpenCV BGR numpy array."""
    if image.mode != "RGB":
        image = image.convert("RGB")
    arr = np.array(image)
    return cv2.cvtColor(arr, cv2.COLOR_RGB2BGR)

def preprocess_image_variants(cv_img: np.ndarray) -> List[Tuple[str, np.ndarray]]:
    """
    Generates controlled preprocessing variants for OCR retry strategy:
    1. 'original': raw normalized image.
    2. 'clahe_contrast': grayscale + CLAHE contrast enhancement for low-contrast/fine-print tables.
    3. 'sharpened': unsharp masking for blurry or curved text.
    """
    variants = [("original", cv_img)]

    try:
        # Variant 1: CLAHE contrast enhancement
        gray = cv2.cvtColor(cv_img, cv2.COLOR_BGR2GRAY)
        clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
        enhanced_gray = clahe.apply(gray)
        enhanced_bgr = cv2.cvtColor(enhanced_gray, cv2.COLOR_GRAY2BGR)
        variants.append(("clahe_contrast", enhanced_bgr))

        # Variant 2: Sharpened
        gaussian = cv2.GaussianBlur(cv_img, (0, 0), 2.0)
        sharpened = cv2.addWeighted(cv_img, 1.5, gaussian, -0.5, 0)
        variants.append(("sharpened", sharpened))
    except Exception as e:
        logger.warning(f"Error generating image preprocessing variants: {e}")

    return variants

def group_boxes_spatially(ocr_results: List[Any], line_threshold: float = 14.0) -> List[str]:
    """
    Groups OCR bounding boxes by vertical proximity (y-coordinate) to reconstruct
    natural table rows. This ensures 'Energy' and '381 kcal' stay on the same line
    even when detected as separate column text boxes.
    """
    if not ocr_results:
        return []

    boxes = []
    for item in ocr_results:
        pts, text, conf = item
        yc = sum(p[1] for p in pts) / 4.0
        xc = sum(p[0] for p in pts) / 4.0
        try:
            c_val = float(conf)
        except Exception:
            c_val = 0.5
        boxes.append({
            "text": text.strip(),
            "yc": yc,
            "xc": xc,
            "conf": c_val
        })

    # Sort boxes top to bottom
    boxes.sort(key=lambda b: b["yc"])

    lines: List[str] = []
    curr_line: List[Dict[str, Any]] = []
    curr_y: Optional[float] = None

    for b in boxes:
        if curr_y is None or abs(b["yc"] - curr_y) < line_threshold:
            curr_line.append(b)
            curr_y = b["yc"] if curr_y is None else (curr_y + b["yc"]) / 2.0
        else:
            # Sort current row left to right
            curr_line.sort(key=lambda item: item["xc"])
            lines.append(" ".join(item["text"] for item in curr_line))
            curr_line = [b]
            curr_y = b["yc"]

    if curr_line:
        curr_line.sort(key=lambda item: item["xc"])
        lines.append(" ".join(item["text"] for item in curr_line))

    return lines

def perform_local_ocr_on_bytes(image_bytes: bytes, filename: str = "image.jpg") -> Dict[str, Any]:
    """
    Runs the RapidOCR local engine on raw image bytes.
    Applies EXIF correction, quality-based retry variants, spatial table row grouping,
    and returns detected text, average confidence, and box count.
    """
    if not image_bytes:
        raise ValueError("Image bytes are empty")

    try:
        pil_img = Image.open(io.BytesIO(image_bytes))
        pil_img = correct_image_orientation(pil_img)
        cv_img = pil_to_cv2(pil_img)
    except Exception as e:
        raise ValueError(f"Invalid image format or corrupted bytes: {e}")

    engine = get_ocr_engine()
    variants = preprocess_image_variants(cv_img)

    best_result: Optional[List[Any]] = None
    best_variant_name = "original"
    best_text_lines: List[str] = []
    best_score = -1.0

    for variant_name, img_variant in variants:
        try:
            ocr_res, elapse = engine(img_variant)
            if not ocr_res:
                continue

            # Calculate average confidence and text length
            total_conf = 0.0
            total_chars = 0
            for item in ocr_res:
                pts, text, conf = item
                try:
                    c = float(conf)
                except Exception:
                    c = 0.5
                total_conf += c
                total_chars += len(text)

            avg_conf = total_conf / len(ocr_res)
            # Combined score balancing number of boxes and confidence
            score = len(ocr_res) * 2 + total_chars + (avg_conf * 10)

            if score > best_score:
                best_score = score
                best_result = ocr_res
                best_variant_name = variant_name
                best_text_lines = group_boxes_spatially(ocr_res)

            # If the original raw image already extracted a comprehensive result (>40 boxes), stop retry
            if variant_name == "original" and len(ocr_res) >= 40:
                break
        except Exception as e:
            logger.warning(f"OCR failed on variant '{variant_name}': {e}")

    if not best_result:
        return {
            "success": False,
            "filename": filename,
            "text": "",
            "lines": [],
            "boxes_count": 0,
            "confidence": 0.0,
            "variant_used": "none",
            "error_code": "OCR_NO_TEXT_DETECTED",
            "message": "No readable text detected in this image. Try improving lighting, reducing glare, or cropping closer to the nutrition table."
        }

    confidences = []
    for item in best_result:
        try:
            confidences.append(float(item[2]))
        except Exception:
            confidences.append(0.5)

    avg_confidence = round(sum(confidences) / len(confidences), 3) if confidences else 0.0
    full_text = "\n".join(best_text_lines)

    return {
        "success": True,
        "filename": filename,
        "text": full_text,
        "lines": best_text_lines,
        "boxes_count": len(best_result),
        "confidence": avg_confidence,
        "variant_used": best_variant_name
    }

def process_multiple_images_ocr(images: List[Tuple[str, bytes]]) -> Dict[str, Any]:
    """
    Processes multiple images for a product (e.g. Front of pack + Back nutrition label).
    Aggregates text and computes overall confidence.
    """
    combined_texts: List[str] = []
    total_boxes = 0
    all_confs: List[float] = []
    file_summaries: List[Dict[str, Any]] = []

    for filename, b in images:
        res = perform_local_ocr_on_bytes(b, filename)
        file_summaries.append(res)
        if res["success"]:
            combined_texts.append(f"--- [Label Image: {filename}] ---\n" + res["text"])
            total_boxes += res["boxes_count"]
            all_confs.append(res["confidence"])

    if not combined_texts:
        return {
            "success": False,
            "error_code": "OCR_NO_TEXT_DETECTED",
            "message": "No readable text could be recognized across the uploaded image(s).",
            "raw_text": "",
            "total_boxes": 0,
            "confidence": 0.0,
            "files": file_summaries
        }

    merged_text = "\n\n".join(combined_texts)
    avg_conf = round(sum(all_confs) / len(all_confs), 3) if all_confs else 0.0

    return {
        "success": True,
        "raw_text": merged_text,
        "total_boxes": total_boxes,
        "confidence": avg_conf,
        "files": file_summaries
    }
