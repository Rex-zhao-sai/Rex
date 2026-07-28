#!/usr/bin/env python3
"""
Make all network labels in schematic PDF searchable.
Optimized version: page-level OCR + yellow box detection for missing labels.
"""

import fitz
from PIL import Image
import numpy as np
from scipy import ndimage
import subprocess
import os
import tempfile
import re

INPUT_PDF = "assets/SCH_1606214.a.PDF"
OUTPUT_PDF = "assets/SCH_1606214.a_searchable.PDF"
TMP_DIR = "/tmp/sch_searchable_v2"

DPI = 300
SCALE = DPI / 72.0


def ensure_tmp_dir():
    os.makedirs(TMP_DIR, exist_ok=True)


def get_existing_text_positions(page):
    """Get existing searchable text with bounding boxes."""
    texts = []
    text_dict = page.get_text("dict")
    for block in text_dict.get("blocks", []):
        if "lines" in block:
            for line in block["lines"]:
                for span in line["spans"]:
                    text = span["text"].strip()
                    if text:
                        bbox = span["bbox"]
                        texts.append({
                            'text': text.upper(),
                            'x0': bbox[0], 'y0': bbox[1],
                            'x1': bbox[2], 'y1': bbox[3],
                        })
    return texts


def ocr_page_full(page_idx, doc):
    """Run page-level OCR and return all detected words."""
    page = doc[page_idx]
    pix = page.get_pixmap(dpi=DPI)
    img_path = os.path.join(TMP_DIR, f"page_{page_idx:03d}.png")
    pix.save(img_path)

    base_path = img_path.replace(".png", "")
    cmd = ["tesseract", img_path, base_path, "--psm", "6", "-l", "eng+deu", "tsv"]
    subprocess.run(cmd, capture_output=True, text=True)

    tsv_path = base_path + ".tsv"
    words = []

    if os.path.exists(tsv_path):
        with open(tsv_path, 'r') as f:
            lines = f.readlines()

        for line in lines[1:]:
            parts = line.strip().split('\t')
            if len(parts) >= 12:
                left, top, width, height = parts[6:10]
                conf = parts[10]
                text = parts[11]
                try:
                    conf_val = float(conf)
                except:
                    continue
                if conf_val < 40 or not text.strip():
                    continue

                x0 = float(left) / SCALE
                y0 = float(top) / SCALE
                x1 = (float(left) + float(width)) / SCALE
                y1 = (float(top) + float(height)) / SCALE

                words.append({
                    'text': text.strip(),
                    'x0': x0, 'y0': y0,
                    'x1': x1, 'y1': y1,
                    'confidence': conf_val
                })

    return words


def detect_yellow_box_labels(page_idx, doc, existing_texts):
    """Detect yellow connector boxes and OCR their labels."""
    page = doc[page_idx]
    pix = page.get_pixmap(dpi=DPI)
    arr = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, 3)

    r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
    yellow_mask = (r > 200) & (g > 170) & (b < 150) & (r > b + 50)

    if yellow_mask.sum() < 100:
        return []

    labeled, num_features = ndimage.label(yellow_mask)
    sizes = ndimage.sum(yellow_mask, labeled, range(1, num_features + 1))

    regions = []
    for i in range(num_features):
        if sizes[i] < 200:
            continue
        coords = np.where(labeled == i + 1)
        y_min, y_max = int(coords[0].min()), int(coords[0].max())
        x_min, x_max = int(coords[1].min()), int(coords[1].max())
        width = x_max - x_min
        height = y_max - y_min
        if width < 30 or height < 15 or width > 600 or height > 100:
            continue
        aspect = width / max(height, 1)
        if aspect < 1.5 or aspect > 20:
            continue
        regions.append({
            'x_min': x_min, 'y_min': y_min,
            'x_max': x_max, 'y_max': y_max,
        })

    labels_to_add = []
    for region in regions:
        pad = 8
        y_min = max(0, region['y_min'] - pad)
        y_max = min(arr.shape[0], region['y_max'] + pad)
        x_min = max(0, region['x_min'] - pad)
        x_max = min(arr.shape[1], region['x_max'] + pad)

        crop = arr[y_min:y_max, x_min:x_max]
        crop_img = Image.fromarray(crop)

        tmp_fd, tmp_path = tempfile.mkstemp(suffix=".png", dir=TMP_DIR)
        os.close(tmp_fd)
        crop_img.save(tmp_path)

        base_path = tmp_path.replace(".png", "")
        cmd = ["tesseract", tmp_path, base_path, "--psm", "7", "-l", "eng", "tsv"]
        subprocess.run(cmd, capture_output=True, text=True)

        tsv_path = base_path + ".tsv"
        text = ""
        conf = 0
        if os.path.exists(tsv_path):
            with open(tsv_path, 'r') as f:
                tsv_lines = f.readlines()
            for tsv_line in tsv_lines[1:]:
                tsv_parts = tsv_line.strip().split('\t')
                if len(tsv_parts) >= 12:
                    t = tsv_parts[11].strip()
                    c = tsv_parts[10]
                    try:
                        c_val = float(c)
                    except:
                        continue
                    if c_val > conf and t and len(t) >= 2:
                        conf = c_val
                        text = t

        for ext in [".png", ".tsv", ".box", ".hocr", ".pdf", ".txt", ".osd", ".wordstrbox"]:
            p = base_path + ext
            if os.path.exists(p):
                os.remove(p)

        # Fix common OCR errors
        text = text.replace('CANO_', 'CAN0_').replace('CANI_', 'CAN1_')
        text = text.replace('CANO', 'CAN0').replace('CANI', 'CAN1')
        text = text.replace('MoTOR_LY-', 'MOTOR_LV-')
        text = text.replace('MOTOR_RESI', 'MOTOR_RES1')
        text = re.sub(r'^[^A-Za-z0-9+_]+', '', text)
        text = re.sub(r'[^A-Za-z0-9+_\-]+$', '', text)

        if not text or len(text) < 2 or conf < 50:
            continue

        x0_pdf = region['x_min'] / SCALE
        y0_pdf = region['y_min'] / SCALE

        # Check if already searchable nearby
        is_dup = False
        for existing in existing_texts:
            if existing['text'] == text.upper():
                dx = abs(x0_pdf - existing['x0'])
                dy = abs(y0_pdf - existing['y0'])
                if dx < 10 and dy < 10:
                    is_dup = True
                    break

        if not is_dup:
            labels_to_add.append({
                'text': text,
                'x0': x0_pdf, 'y0': y0_pdf,
                'x1': region['x_max'] / SCALE,
                'y1': region['y_max'] / SCALE,
                'confidence': conf
            })

    return labels_to_add


def add_text_overlay(page, labels):
    """Add invisible text overlays."""
    count = 0
    for label in labels:
        text = label['text']
        bbox_height = label['y1'] - label['y0']
        font_size = max(bbox_height * 0.55, 3.0)
        baseline_x = label['x0'] + 2
        baseline_y = label['y1'] - font_size * 0.2

        try:
            page.insert_text(
                fitz.Point(baseline_x, baseline_y),
                text,
                fontsize=font_size,
                color=(1, 1, 1),
                fontname="helv",
            )
            count += 1
        except Exception:
            pass
    return count


def main():
    ensure_tmp_dir()

    doc = fitz.open(INPUT_PDF)
    print(f"PDF: {doc.page_count} pages")
    print(f"Output: {OUTPUT_PDF}\n")

    total_added = 0

    for page_idx in range(doc.page_count):
        print(f"Page {page_idx + 1}/{doc.page_count}...", end=" ", flush=True)
        page = doc[page_idx]

        existing = get_existing_text_positions(page)

        # Step 1: Page-level OCR for general text
        ocr_words = ocr_page_full(page_idx, doc)

        # Find missing labels from page-level OCR
        existing_upper = {t['text'] for t in existing}
        missing_from_ocr = []
        for word in ocr_words:
            text_upper = word['text'].upper()
            if text_upper in existing_upper:
                continue
            # Check if it's a network label
            is_net = any(kw in text_upper for kw in [
                'HALL', 'MOTOR', 'SNV', 'STV', 'RNV', 'LV', 'FWD', 'BWD',
                'HEIGHT', 'SUPPLY', 'D_OUT', 'ADC_IN', 'DV_', 'WDW',
                'CAN', 'LIN', 'KL', 'LED', 'GND', 'PWM',
                'PWR', 'FLAG', 'WK', 'HOLD', 'DIO', 'BT', 'MA_',
                'HV', 'SELF', 'OUT_', 'NFLAG',
            ])
            if is_net and len(word['text']) >= 2:
                # Check spatial proximity
                is_near = False
                for ex in existing:
                    if abs(word['x0'] - ex['x0']) < 5 and abs(word['y0'] - ex['y0']) < 5:
                        is_near = True
                        break
                if not is_near:
                    missing_from_ocr.append(word)

        # Step 2: Yellow box detection for connector labels
        yellow_labels = detect_yellow_box_labels(page_idx, doc, existing)

        all_missing = missing_from_ocr + yellow_labels

        if all_missing:
            count = add_text_overlay(page, all_missing)
            total_added += count
            label_texts = [f"{l['text']}(c={l['confidence']:.0f})" for l in all_missing[:10]]
            print(f"+{count} labels: {label_texts}{'...' if len(all_missing) > 10 else ''}")
        else:
            print("all labels searchable")

    # Save
    doc.save(OUTPUT_PDF, garbage=4, deflate=True)
    doc.close()

    print(f"\n{'=' * 50}")
    print(f"Total invisible text overlays added: {total_added}")
    print(f"Output: {OUTPUT_PDF}")

    # Verify
    print(f"\n{'=' * 50}")
    print("Verification:")
    new_doc = fitz.open(OUTPUT_PDF)

    check_labels = [
        "HALL_SNV", "HALL_STV", "HALL_RNV", "HALL_LV",
        "MOTOR_SNV", "MOTOR_STV", "MOTOR_RNV", "MOTOR_LV",
        "HALL_SUPPLY1", "HALL_SUPPLY2", "HALL_SUPPLY3",
        "D_OUT_RES1", "D_OUT_RES2", "D_OUT_RES3",
        "ADC_IN_RES1", "ADC_IN_RES2",
        "LV_FWD", "LV_BWD", "RNV_FWD", "RNV_BWD",
        "STV_FWD", "STV_BWD", "SNV_UP", "SNV_DOWN",
        "HEIGHT_UP", "HEIGHT_DOWN",
        "M_BT1-4", "M_LED1", "M_LED2", "M_LED3", "MA_LED",
        "DV_1", "DV_2", "WDW_1", "WDW_2", "M_GND", "M_KL30",
        "CAN0_H", "CAN0_L", "CAN1_H", "CAN1_L", "LIN",
        "KL15", "HV_WAKE", "OUT_PWM",
        "PWR_ENA", "nFLAG", "CAN_WK", "SELF_HOLD",
        "DIO_LED1", "DIO_LED2", "DIO_LED3", "DIO_MA_LED",
        "MOTOR_RES1", "MOTOR_RES2",
        "HALL_RES1", "HALL_RES2",
    ]

    found_count = 0
    for label in check_labels:
        pages = []
        for i in range(new_doc.page_count):
            if label in new_doc[i].get_text("text"):
                pages.append(i + 1)
        if pages:
            found_count += 1
        status = f"p{pages}" if pages else "NOT FOUND"
        print(f"  {label:20s} -> {status}")

    print(f"\nFound: {found_count}/{len(check_labels)} labels")
    new_doc.close()


if __name__ == "__main__":
    main()
