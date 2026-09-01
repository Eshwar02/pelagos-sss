from pathlib import Path
import random
from PIL import Image, ImageDraw

# Dataset location
DATASET = Path("processed_data/yolo_dataset")

# Where verified images will be saved
OUTPUT_DIR = Path("verification_results")
OUTPUT_DIR.mkdir(exist_ok=True)

# Number of images to check from each split
NUM_IMAGES = 5

# Check all dataset splits
SPLITS = ["train", "valid", "test"]


def draw_yolo_boxes(image_path, label_path, output_path):
    """Draw YOLO bounding boxes on an image."""

    image = Image.open(image_path).convert("RGB")
    draw = ImageDraw.Draw(image)

    image_width, image_height = image.size

    if label_path.exists():

        with open(label_path, "r") as file:

            for line in file:

                values = line.strip().split()

                if len(values) != 5:
                    continue

                class_id, x_center, y_center, width, height = map(
                    float, values
                )

                # Convert normalized YOLO values
                # back to pixel coordinates
                x_center *= image_width
                y_center *= image_height
                width *= image_width
                height *= image_height

                x1 = x_center - width / 2
                y1 = y_center - height / 2
                x2 = x_center + width / 2
                y2 = y_center + height / 2

                # Draw bounding box
                draw.rectangle(
                    [x1, y1, x2, y2],
                    outline="red",
                    width=3
                )

                # Draw class name
                draw.text(
                    (x1, max(0, y1 - 15)),
                    "Crab-Pot",
                    fill="red"
                )

    image.save(output_path)


for split in SPLITS:

    print(f"\nChecking {split}...")

    images_dir = DATASET / "images" / split
    labels_dir = DATASET / "labels" / split

    # Find all JPG images
    images = list(images_dir.glob("*.jpg"))

    if not images:
        images = list(images_dir.glob("*.jpeg"))

    if not images:
        images = list(images_dir.glob("*.png"))

    if not images:
        print(f"No images found in {images_dir}")
        continue

    # Randomly select images
    selected_images = random.sample(
        images,
        min(NUM_IMAGES, len(images))
    )

    for image_path in selected_images:

        label_path = (
            labels_dir /
            f"{image_path.stem}.txt"
        )

        output_path = (
            OUTPUT_DIR /
            f"{split}_{image_path.stem}.jpg"
        )

        draw_yolo_boxes(
            image_path,
            label_path,
            output_path
        )

        print(f"Saved: {output_path}")


print("\n" + "=" * 50)
print("VISUAL VERIFICATION COMPLETE")
print("=" * 50)
print(f"Check this folder: {OUTPUT_DIR.resolve()}")