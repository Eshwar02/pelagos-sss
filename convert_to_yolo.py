import json
import shutil
from pathlib import Path
from PIL import Image

# -----------------------------
# CONFIGURATION
# -----------------------------

RAW_DATASET = Path("raw_data/ghost_pot")
OUTPUT_DATASET = Path("processed_data/yolo_dataset")

# Class mapping
CLASS_MAP = {
    "Crab-Pot": 0
}

SPLITS = ["train", "valid", "test"]

# Statistics
total_images = 0
total_labels = 0
missing_images = []
unknown_categories = []
invalid_boxes = []


def convert_bbox_to_yolo(bbox, image_width, image_height):
    """
    Converts:
    [x, y, width, height]

    Into YOLO format:
    x_center y_center width height

    All values normalized from 0 to 1.
    """

    x, y, width, height = bbox

    # Calculate center
    x_center = x + width / 2
    y_center = y + height / 2

    # Normalize
    x_center /= image_width
    y_center /= image_height
    width /= image_width
    height /= image_height

    return x_center, y_center, width, height


# -----------------------------
# CREATE OUTPUT FOLDERS
# -----------------------------

for split in SPLITS:
    (OUTPUT_DATASET / "images" / split).mkdir(
        parents=True,
        exist_ok=True
    )

    (OUTPUT_DATASET / "labels" / split).mkdir(
        parents=True,
        exist_ok=True
    )


# -----------------------------
# PROCESS EACH SPLIT
# -----------------------------

for split in SPLITS:

    print(f"\nProcessing {split}...")

    split_folder = RAW_DATASET / split
    metadata_file = split_folder / "metadata.jsonl"

    if not metadata_file.exists():
        print(f"ERROR: Metadata file not found: {metadata_file}")
        continue

    with open(metadata_file, "r", encoding="utf-8") as file:

        for line_number, line in enumerate(file, start=1):

            line = line.strip()

            if not line:
                continue

            try:
                data = json.loads(line)
            except json.JSONDecodeError:
                print(
                    f"WARNING: Invalid JSON "
                    f"in {split}, line {line_number}"
                )
                continue

            file_name = data.get("file_name")
            objects = data.get("objects", {})

            if not file_name:
                print(
                    f"WARNING: Missing file_name "
                    f"in {split}, line {line_number}"
                )
                continue

            image_path = split_folder / file_name

            # Check image exists
            if not image_path.exists():
                missing_images.append(str(image_path))
                continue

            # Read actual image dimensions
            try:
                with Image.open(image_path) as img:
                    image_width, image_height = img.size
            except Exception as e:
                print(f"ERROR opening image: {image_path}")
                print(e)
                continue

            # Get annotations
            bboxes = objects.get("bbox", [])
            categories = objects.get("category", [])

            # Create output paths
            output_image_path = (
                OUTPUT_DATASET
                / "images"
                / split
                / image_path.name
            )

            label_path = (
                OUTPUT_DATASET
                / "labels"
                / split
                / f"{image_path.stem}.txt"
            )

            # Copy image
            shutil.copy2(image_path, output_image_path)

            # Create YOLO label file
            label_lines = []

            for bbox, category in zip(bboxes, categories):

                # Categories appear as strings
                if category not in CLASS_MAP:
                    unknown_categories.append(category)
                    continue

                # Validate bbox
                if len(bbox) != 4:
                    invalid_boxes.append(
                        (file_name, bbox)
                    )
                    continue

                x, y, width, height = bbox

                if width <= 0 or height <= 0:
                    invalid_boxes.append(
                        (file_name, bbox)
                    )
                    continue

                class_id = CLASS_MAP[category]

                (
                    x_center,
                    y_center,
                    normalized_width,
                    normalized_height
                ) = convert_bbox_to_yolo(
                    bbox,
                    image_width,
                    image_height
                )

                # Check normalized values
                values = [
                    x_center,
                    y_center,
                    normalized_width,
                    normalized_height
                ]

                if not all(0 <= value <= 1 for value in values):
                    invalid_boxes.append(
                        (file_name, bbox)
                    )
                    continue

                label_lines.append(
                    f"{class_id} "
                    f"{x_center:.6f} "
                    f"{y_center:.6f} "
                    f"{normalized_width:.6f} "
                    f"{normalized_height:.6f}"
                )

                total_labels += 1

            # Write label file
            with open(label_path, "w", encoding="utf-8") as label_file:

                for label in label_lines:
                    label_file.write(label + "\n")

            total_images += 1


# -----------------------------
# FINAL REPORT
# -----------------------------

print("\n" + "=" * 50)
print("CONVERSION COMPLETE")
print("=" * 50)

print(f"Images processed: {total_images}")
print(f"Object labels created: {total_labels}")
print(f"Missing images: {len(missing_images)}")
print(f"Unknown categories: {len(set(unknown_categories))}")
print(f"Invalid bounding boxes: {len(invalid_boxes)}")

if unknown_categories:
    print("\nUnknown categories found:")
    print(set(unknown_categories))

if missing_images:
    print("\nFirst 5 missing images:")
    for image in missing_images[:5]:
        print(image)

if invalid_boxes:
    print("\nFirst 5 invalid boxes:")
    for box in invalid_boxes[:5]:
        print(box)

print("\nOutput location:")
print(OUTPUT_DATASET.resolve())