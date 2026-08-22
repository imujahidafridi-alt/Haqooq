import os
from PIL import Image, ImageOps

source_path = r"c:\Users\mujah\OneDrive\Desktop\haqooq\mobile\assets\new_logo.png"
mobile_assets_dir = r"c:\Users\mujah\OneDrive\Desktop\haqooq\mobile\assets"
android_res_dir = r"c:\Users\mujah\OneDrive\Desktop\haqooq\mobile\android\app\src\main\res"
web_public_dir = r"c:\Users\mujah\OneDrive\Desktop\haqooq\web\public"

os.makedirs(mobile_assets_dir, exist_ok=True)
os.makedirs(web_public_dir, exist_ok=True)

img = Image.open(source_path).convert("RGBA")
print(f"Loaded source image: {img.size}")

def create_adaptive_foreground(image, target_size=(1024, 1024), scale_factor=0.65):
    """
    Creates an Android adaptive icon foreground with safe margins
    (inner 66% safe zone per Google Material Design specs)
    """
    bg = Image.new("RGBA", target_size, (0, 0, 0, 0))
    inner_w = int(target_size[0] * scale_factor)
    inner_h = int(target_size[1] * scale_factor)
    
    # Maintain aspect ratio
    resized_img = image.copy()
    resized_img.thumbnail((inner_w, inner_h), Image.Resampling.LANCZOS)
    
    offset_x = (target_size[0] - resized_img.width) // 2
    offset_y = (target_size[1] - resized_img.height) // 2
    bg.paste(resized_img, (offset_x, offset_y), resized_img)
    return bg

def create_monochrome(image, target_size=(1024, 1024)):
    fg = create_adaptive_foreground(image, target_size, 0.65)
    r, g, b, a = fg.split()
    gray = ImageOps.grayscale(fg)
    mono = Image.merge("RGBA", (gray, gray, gray, a))
    return mono

# 1. Expo Assets (mobile/assets)
print("Generating Expo assets...")
# icon.png (1024x1024)
icon = img.resize((1024, 1024), Image.Resampling.LANCZOS)
icon.save(os.path.join(mobile_assets_dir, "icon.png"), "PNG")
icon.save(os.path.join(mobile_assets_dir, "logo.png"), "PNG")

# android-icon-foreground.png (1024x1024 with safe zone)
adaptive_fg = create_adaptive_foreground(img, (1024, 1024), 0.65)
adaptive_fg.save(os.path.join(mobile_assets_dir, "android-icon-foreground.png"), "PNG")

# android-icon-background.png (1024x1024 dark slate brand background)
bg_color = (15, 23, 42, 255) # #0F172A deep slate
adaptive_bg = Image.new("RGBA", (1024, 1024), bg_color)
adaptive_bg.save(os.path.join(mobile_assets_dir, "android-icon-background.png"), "PNG")

# android-icon-monochrome.png (1024x1024)
mono = create_monochrome(img, (1024, 1024))
mono.save(os.path.join(mobile_assets_dir, "android-icon-monochrome.png"), "PNG")

# splash-icon.png (512x512)
splash = create_adaptive_foreground(img, (512, 512), 0.8)
splash.save(os.path.join(mobile_assets_dir, "splash-icon.png"), "PNG")

# favicon.png (192x192)
favicon = img.resize((192, 192), Image.Resampling.LANCZOS)
favicon.save(os.path.join(mobile_assets_dir, "favicon.png"), "PNG")

# 2. Web public assets
print("Generating Web public assets...")
web_logo = img.resize((512, 512), Image.Resampling.LANCZOS)
web_logo.save(os.path.join(web_public_dir, "logo.png"), "PNG")
favicon.save(os.path.join(web_public_dir, "favicon.png"), "PNG")
favicon_48 = img.resize((48, 48), Image.Resampling.LANCZOS)
favicon_48.save(os.path.join(web_public_dir, "favicon.ico"), "ICO")

# 3. Android Native Drawables (splashscreen_logo.png)
print("Generating Android drawables...")
splash_sizes = {
    "drawable-mdpi": (200, 200),
    "drawable-hdpi": (300, 300),
    "drawable-xhdpi": (400, 400),
    "drawable-xxhdpi": (600, 600),
    "drawable-xxxhdpi": (800, 800),
}

for folder, size in splash_sizes.items():
    folder_path = os.path.join(android_res_dir, folder)
    os.makedirs(folder_path, exist_ok=True)
    res_img = img.resize(size, Image.Resampling.LANCZOS)
    res_img.save(os.path.join(folder_path, "splashscreen_logo.png"), "PNG")

# 4. Android Native Mipmaps (ic_launcher.webp, ic_launcher_foreground.webp, ic_launcher_round.webp)
print("Generating Android mipmaps...")
mipmap_specs = {
    "mipmap-mdpi": {"icon": (48, 48), "fg": (108, 108)},
    "mipmap-hdpi": {"icon": (72, 72), "fg": (162, 162)},
    "mipmap-xhdpi": {"icon": (96, 96), "fg": (216, 216)},
    "mipmap-xxhdpi": {"icon": (144, 144), "fg": (324, 324)},
    "mipmap-xxxhdpi": {"icon": (192, 192), "fg": (432, 432)},
}

for folder, specs in mipmap_specs.items():
    folder_path = os.path.join(android_res_dir, folder)
    os.makedirs(folder_path, exist_ok=True)
    
    # Icon with background
    icon_size = specs["icon"]
    base_icon = Image.new("RGBA", icon_size, bg_color)
    inner_logo = create_adaptive_foreground(img, icon_size, 0.75)
    base_icon.paste(inner_logo, (0, 0), inner_logo)
    base_icon.save(os.path.join(folder_path, "ic_launcher.webp"), "WEBP")
    base_icon.save(os.path.join(folder_path, "ic_launcher_round.webp"), "WEBP")
    
    # Foreground with safe zone
    fg_size = specs["fg"]
    fg_img = create_adaptive_foreground(img, fg_size, 0.65)
    fg_img.save(os.path.join(folder_path, "ic_launcher_foreground.webp"), "WEBP")
    
    # Monochrome
    mono_img = create_monochrome(img, fg_size)
    mono_img.save(os.path.join(folder_path, "ic_launcher_monochrome.webp"), "WEBP")

print("All Android & Web assets successfully generated with standard specifications!")
