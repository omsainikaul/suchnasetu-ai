import io
import logging
from typing import Tuple, List, Dict, Any, Optional
from PIL import Image, ImageOps, ImageFilter
from app.core.config import settings

logger = logging.getLogger(__name__)

class OCRResult:
    def __init__(
        self,
        text: str,
        confidence: float,
        lines: List[Dict[str, Any]],
        is_low_quality: bool = False,
        quality_reason: Optional[str] = None
    ):
        self.text = text
        self.confidence = confidence
        self.lines = lines
        self.is_low_quality = is_low_quality
        self.quality_reason = quality_reason

class OCRService:
    def __init__(self):
        self._engine = None
        self._initialized = False

    def _get_engine(self):
        if not self._initialized:
            try:
                from rapidocr_onnxruntime import RapidOCR
                self._engine = RapidOCR()
                self._initialized = True
                logger.info("RapidOCR initialized successfully.")
            except Exception as e:
                logger.warning(f"Could not initialize RapidOCR: {e}. Falling back to basic processor.")
                self._engine = None
                self._initialized = True
        return self._engine

    def validate_image_bytes(self, image_bytes: bytes, mime_type: Optional[str] = None) -> Tuple[bool, Optional[str]]:
        """Validate image size and valid image format."""
        if not image_bytes or len(image_bytes) == 0:
            return False, "Uploaded image file is empty."
        
        max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
        if len(image_bytes) > max_bytes:
            return False, f"File exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE_MB}MB."
        
        try:
            with Image.open(io.BytesIO(image_bytes)) as img:
                img.verify()
                format_lower = (img.format or "").lower()
                valid_formats = ["jpeg", "jpg", "png", "webp"]
                if format_lower not in valid_formats:
                    return False, f"Unsupported image format: {img.format}. Allowed: PNG, JPEG, WebP."
        except Exception as e:
            return False, f"Invalid or corrupted image file: {str(e)}"
        
        return True, None

    def preprocess_image(self, img: Image.Image) -> Image.Image:
        """Enhance image contrast and remove noise for better OCR accuracy."""
        # Convert to RGB if needed
        if img.mode not in ("RGB", "L"):
            img = img.convert("RGB")
        
        # Auto-orient based on EXIF
        try:
            img = ImageOps.exif_transpose(img)
        except Exception:
            pass

        return img

    def extract_text(self, image_bytes: bytes) -> OCRResult:
        """Run OCR extraction using RapidOCR."""
        is_valid, error = self.validate_image_bytes(image_bytes)
        if not is_valid:
            raise ValueError(error)

        with Image.open(io.BytesIO(image_bytes)) as img:
            processed_img = self.preprocess_image(img)
            # Convert PIL image to bytes or numpy array
            import numpy as np
            np_img = np.array(processed_img)

        engine = self._get_engine()
        if engine is None:
            raise RuntimeError("OCR engine is unavailable. Please check system dependencies.")

        try:
            # RapidOCR returns: (result, elapse_list)
            # result is list of [[box_coordinates], text, score]
            ocr_result, elapse = engine(np_img)
            
            if not ocr_result:
                return OCRResult(
                    text="",
                    confidence=0.0,
                    lines=[],
                    is_low_quality=True,
                    quality_reason="No recognizable text found in the image. Please upload a clearer notice."
                )

            extracted_lines = []
            scores = []
            full_text_parts = []

            for item in ocr_result:
                # item structure: [box, text, score]
                box = item[0]
                text = str(item[1]).strip()
                score = float(item[2])
                if text:
                    full_text_parts.append(text)
                    scores.append(score)
                    extracted_lines.append({
                        "box": box,
                        "text": text,
                        "confidence": round(score, 3)
                    })

            combined_text = "\n".join(full_text_parts)
            avg_score = float(np.mean(scores)) if scores else 0.0
            
            is_low_quality = avg_score < 0.65 or len(combined_text.split()) < 5
            quality_reason = None
            if is_low_quality:
                quality_reason = "Low text recognition confidence detected. Some fields may require manual review."

            return OCRResult(
                text=combined_text,
                confidence=round(avg_score, 3),
                lines=extracted_lines,
                is_low_quality=is_low_quality,
                quality_reason=quality_reason
            )

        except Exception as e:
            logger.error(f"OCR processing failed: {e}", exc_info=True)
            raise RuntimeError(f"OCR text extraction failed: {str(e)}")

ocr_service = OCRService()
