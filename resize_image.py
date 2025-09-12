from PIL import Image

def resize_image(input_image_path, output_image_path, size):
    try:
        with Image.open(input_image_path) as img:
            img = img.resize(size)
            img.save(output_image_path)
        print(f"Image resized and saved to {output_image_path}")
    except FileNotFoundError:
        print(f"Error: Input image not found at {input_image_path}")
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    input_path = "golfapp-client/src/theopenimage.jpg"
    output_path_192 = "golfapp-client/public/logo192.png"
    output_path_512 = "golfapp-client/public/logo512.png"
    new_size_192 = (192, 192)
    new_size_512 = (512, 512)

    resize_image(input_path, output_path_192, new_size_192)
    resize_image(input_path, output_path_512, new_size_512)
