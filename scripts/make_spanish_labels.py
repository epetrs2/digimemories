import math
import random
from PIL import Image, ImageDraw, ImageFont, ImageFilter

def edit_tape_tangled():
    img = Image.open('public/tape_tangled.jpg').convert('RGB')
    w, h = img.size
    
    # Coordinates of original text line on the label:
    # (215, 715) to (610, 835), angle is ~ -17.5 degrees
    # We can create an aged paper patch along this line
    patch_w = 420
    patch_h = 42
    
    patch = Image.new('RGBA', (patch_w, patch_h), (0, 0, 0, 0))
    p_draw = ImageDraw.Draw(patch)
    
    # Fill with aged vintage paper color sampled from the cassette label
    base_color = (195, 178, 155)
    for y in range(patch_h):
        for x in range(patch_w):
            # Add vintage grain / texture
            noise = random.randint(-12, 12)
            # subtle gradient across the label
            grad = int((x / patch_w) * 15) - 8
            r = min(255, max(0, base_color[0] + noise + grad))
            g = min(255, max(0, base_color[1] + noise + grad))
            b = min(255, max(0, base_color[2] + noise + grad))
            # feather edges
            alpha = 255
            if y < 4:
                alpha = int(255 * (y / 4))
            elif y > patch_h - 5:
                alpha = int(255 * ((patch_h - y) / 4))
            if x < 6:
                alpha = min(alpha, int(255 * (x / 6)))
            elif x > patch_w - 7:
                alpha = min(alpha, int(255 * ((patch_w - x) / 6)))
            p_draw.point((x, y), fill=(r, g, b, alpha))
            
    # Draw handwritten text in Spanish with authentic ballpoint pen style
    font = ImageFont.truetype('/Library/Fonts/NanumBrushScript-Regular.ttf', 35)
    text = "RECUERDOS FAMILIA - 1994"
    # ink color: vintage slightly faded black/sepia ballpoint ink
    ink_color = (25, 22, 18, 240)
    p_draw.text((30, 4), text, fill=ink_color, font=font)
    
    # Rotate by -17.2 degrees
    rotated = patch.rotate(-17.2, resample=Image.BICUBIC, expand=True)
    
    # Paste onto image at exact position
    img_rgba = img.convert('RGBA')
    img_rgba.paste(rotated, (198, 698), rotated)
    
    out = img_rgba.convert('RGB')
    out.save('public/tape_tangled_es.jpg', quality=95)
    print("Saved tape_tangled_es.jpg")

def edit_step1():
    img = Image.open('public/step1.jpg').convert('RGB')
    
    # Label is in region (380, 420) to (590, 580), angle is approx -32 degrees
    # Text to replace: "Home Movies -" and "SUMMER 1989"
    patch_w = 210
    patch_h = 95
    
    patch = Image.new('RGBA', (patch_w, patch_h), (0, 0, 0, 0))
    p_draw = ImageDraw.Draw(patch)
    
    base_color = (215, 195, 168)
    for y in range(patch_h):
        for x in range(patch_w):
            noise = random.randint(-14, 14)
            r = min(255, max(0, base_color[0] + noise))
            g = min(255, max(0, base_color[1] + noise))
            b = min(255, max(0, base_color[2] + noise))
            alpha = 255
            if y < 4 or y > patch_h - 5 or x < 4 or x > patch_w - 5:
                alpha = 180
            p_draw.point((x, y), fill=(r, g, b, alpha))
            
    # Draw faint line markings like on TDK cassette labels
    p_draw.line([(10, 48), (patch_w - 10, 48)], fill=(170, 150, 125, 120), width=1)
    p_draw.line([(10, 88), (patch_w - 10, 88)], fill=(170, 150, 125, 120), width=1)
    
    font1 = ImageFont.truetype('/Library/Fonts/NanumBrushScript-Regular.ttf', 32)
    font2 = ImageFont.truetype('/Library/Fonts/NanumBrushScript-Regular.ttf', 30)
    
    ink_color = (25, 22, 18, 245)
    p_draw.text((15, 10), "Recuerdos Familia -", fill=ink_color, font=font1)
    p_draw.text((25, 52), "VERANO 1989", fill=ink_color, font=font2)
    
    rotated = patch.rotate(-32.5, resample=Image.BICUBIC, expand=True)
    
    img_rgba = img.convert('RGBA')
    img_rgba.paste(rotated, (380, 420), rotated)
    
    out = img_rgba.convert('RGB')
    out.save('public/step1_es.jpg', quality=95)
    print("Saved step1_es.jpg")

if __name__ == '__main__':
    edit_tape_tangled()
    edit_step1()
