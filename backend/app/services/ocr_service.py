import io
import re
import os
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
        quality_reason: Optional[str] = None,
        engine_used: str = "rapidocr"
    ):
        self.text = text
        self.confidence = confidence
        self.lines = lines
        self.is_low_quality = is_low_quality
        self.quality_reason = quality_reason
        self.engine_used = engine_used

class OCRService:
    def __init__(self):
        self._rapid_engine = None
        self._rapid_initialized = False
        self._tesseract_available: Optional[bool] = None

    def _get_rapid_engine(self):
        if not self._rapid_initialized:
            try:
                from rapidocr_onnxruntime import RapidOCR
                self._rapid_engine = RapidOCR()
                self._rapid_initialized = True
                logger.info("RapidOCR initialized successfully.")
            except Exception as e:
                logger.warning(f"Could not initialize RapidOCR: {e}. Falling back to secondary processors.")
                self._rapid_engine = None
                self._rapid_initialized = True
        return self._rapid_engine

    def _check_tesseract(self) -> bool:
        if self._tesseract_available is None:
            try:
                import pytesseract
                # Verify that tesseract binary is actually discoverable on system PATH
                pytesseract.get_tesseract_version()
                self._tesseract_available = True
            except Exception:
                self._tesseract_available = False
        return self._tesseract_available

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
                valid_formats = ["jpeg", "jpg", "png", "webp", "tiff", "tif"]
                if format_lower not in valid_formats:
                    return False, f"Unsupported image format: {img.format}. Allowed: PNG, JPEG, WebP, TIFF."
        except Exception as e:
            return False, f"Invalid or corrupted image file: {str(e)}"
        
        return True, None

    def preprocess_image(self, img: Image.Image) -> Image.Image:
        """
        Enhance image contrast and resolution for superior OCR accuracy.
        Applies EXIF correction, grayscale conversion, DPI upscale for small images,
        auto-contrast stretching and edge sharpening.
        """
        # Auto-orient based on EXIF
        try:
            img = ImageOps.exif_transpose(img)
        except Exception:
            pass

        # Convert to RGB if palette/alpha
        if img.mode not in ("RGB", "L"):
            img = img.convert("RGB")

        # Rescale low-resolution images
        w, h = img.size
        if w < 1200:
            scale = 1.5
            img = img.resize((int(w * scale), int(h * scale)), Image.Resampling.LANCZOS)

        # Autocontrast
        try:
            gray = img.convert("L")
            stretched = ImageOps.autocontrast(gray, cutoff=1)
            sharpened = stretched.filter(ImageFilter.SHARPEN)
            return sharpened.convert("RGB")
        except Exception:
            return img

    def extract_pdf_text(self, pdf_bytes: bytes) -> OCRResult:
        """
        Extract text from PDF files:
        1. Attempts high-fidelity native digital extraction using pypdf.
        2. If digital text is missing (scanned/image PDF), renders pages to images with pypdfium2 and applies OCR.
        3. Falls back to embedded image extraction if rasterization fails.
        """
        if not pdf_bytes:
            raise ValueError("Uploaded PDF file is empty.")

        max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
        if len(pdf_bytes) > max_bytes:
            raise ValueError(f"PDF exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE_MB}MB.")

        extracted_pages = []
        try:
            import pypdf
            reader = pypdf.PdfReader(io.BytesIO(pdf_bytes))
            for idx, page in enumerate(reader.pages):
                text = page.extract_text() or ""
                if text.strip():
                    extracted_pages.append(text.strip())

            full_digital_text = "\n\n".join(extracted_pages).strip()
            if len(full_digital_text) >= 30:
                lines = [{"box": [], "text": line, "confidence": 1.0} for line in full_digital_text.splitlines() if line.strip()]
                return OCRResult(
                    text=full_digital_text,
                    confidence=1.0,
                    lines=lines,
                    is_low_quality=False,
                    engine_used="pypdf_digital"
                )
        except Exception as e:
            logger.warning(f"Digital PDF extraction encountered an issue: {e}. Trying scanned page rendering.")

        # Fallback for scanned PDF: 1. Full page rendering via pypdfium2 (preferred)
        try:
            import pypdfium2 as pdfium
            import numpy as np
            pdf = pdfium.PdfDocument(pdf_bytes)
            scanned_texts = []
            extracted_lines = []
            scores = []
            for page_idx in range(len(pdf)):
                page = pdf[page_idx]
                pil_image = page.render(scale=2.0).to_pil()
                img_buf = io.BytesIO()
                pil_image.save(img_buf, format="PNG")
                res = self.extract_text(img_buf.getvalue())
                if res.text.strip():
                    scanned_texts.append(res.text.strip())
                    extracted_lines.extend(res.lines)
                    scores.append(res.confidence)
            if scanned_texts:
                combined = "\n\n".join(scanned_texts)
                avg_conf = float(np.mean(scores)) if scores else 0.85
                return OCRResult(
                    text=combined,
                    confidence=round(avg_conf, 3),
                    lines=extracted_lines,
                    is_low_quality=avg_conf < 0.65 or len(combined.split()) < 5,
                    quality_reason="Low OCR confidence from scanned PDF pages." if (avg_conf < 0.65) else None,
                    engine_used="pypdfium2_raster_ocr"
                )
        except Exception as raster_err:
            logger.warning(f"Full-page PDF rendering via pypdfium2 failed: {raster_err}. Trying embedded image extraction.")

        # Fallback for scanned PDF: 2. Extract embedded images
        try:
            import pypdf
            reader = pypdf.PdfReader(io.BytesIO(pdf_bytes))
            scanned_texts = []
            for page in reader.pages:
                for img_obj in page.images:
                    img_data = img_obj.data
                    res = self.extract_text(img_data)
                    if res.text.strip():
                        scanned_texts.append(res.text.strip())
            if scanned_texts:
                combined = "\n\n".join(scanned_texts)
                return OCRResult(
                    text=combined,
                    confidence=0.85,
                    lines=[{"box": [], "text": l, "confidence": 0.85} for l in combined.splitlines() if l.strip()],
                    is_low_quality=False,
                    engine_used="pdf_embedded_ocr"
                )
        except Exception as img_err:
            logger.warning(f"Scanned PDF embedded image extraction failed: {img_err}")

        # If digital text was partially extracted, use whatever was found
        if extracted_pages:
            combined = "\n\n".join(extracted_pages).strip()
            return OCRResult(
                text=combined,
                confidence=0.75,
                lines=[{"box": [], "text": l, "confidence": 0.75} for l in combined.splitlines() if l.strip()],
                is_low_quality=len(combined.split()) < 5,
                quality_reason="PDF had sparse extractable digital text." if len(combined.split()) < 5 else None,
                engine_used="pypdf_partial"
            )

        raise ValueError("Could not extract readable text from the provided PDF. The file may be password protected or purely scanned without OCR layer.")

    def extract_text(self, image_bytes: bytes) -> OCRResult:
        """Run OCR extraction using RapidOCR with Tesseract fallback and adaptive preprocessing."""
        is_valid, error = self.validate_image_bytes(image_bytes)
        if not is_valid:
            raise ValueError(error)

        with Image.open(io.BytesIO(image_bytes)) as raw_img:
            processed_img = self.preprocess_image(raw_img)
            import numpy as np
            np_img = np.array(processed_img)

        # 1. Primary Engine: RapidOCR
        rapid_engine = self._get_rapid_engine()
        if rapid_engine is not None:
            try:
                ocr_result, elapse = rapid_engine(np_img)
                if not ocr_result:
                    return OCRResult(
                        text="",
                        confidence=0.0,
                        lines=[],
                        is_low_quality=True,
                        quality_reason="No recognizable text found in the image. Please upload a clearer notice.",
                        engine_used="rapidocr"
                    )

                extracted_lines = []
                scores = []
                full_text_parts = []

                for item in ocr_result:
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
                    quality_reason=quality_reason,
                    engine_used="rapidocr"
                )
            except Exception as e:
                logger.warning(f"RapidOCR execution failed: {e}. Trying secondary OCR fallback.")

        # 2. Secondary Engine: Tesseract
        if self._check_tesseract():
            try:
                import pytesseract
                tess_text = pytesseract.image_to_string(processed_img, lang="eng+hin").strip()
                if tess_text:
                    lines = [{"box": [], "text": l, "confidence": 0.85} for l in tess_text.splitlines() if l.strip()]
                    return OCRResult(
                        text=tess_text,
                        confidence=0.85,
                        lines=lines,
                        is_low_quality=False,
                        engine_used="tesseract"
                    )
            except Exception as tess_err:
                logger.warning(f"Tesseract OCR fallback failed: {tess_err}")

        raise RuntimeError("OCR engine is unavailable. Please check system dependencies (rapidocr_onnxruntime or pytesseract).")

ocr_service = OCRService()
