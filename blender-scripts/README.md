# StitchSmart — Blender Scripts

**Owner:** Member 1 & 2  
**Tech:** Blender 3.6+ · Python (bpy) · GLTF · SVG

---

## What This Folder Does

The backend calls Blender in headless mode to:
1. Build a 3D body mesh scaled to the user's measurements
2. Drape a dress mesh over it (style-specific geometry)
3. Apply the enhanced dress image as a texture
4. UV-unwrap the dress and export a 2D SVG die-line pattern
5. Export the full scene as a GLTF file for the browser 3D viewer

---

## Folder Structure

```
blender-scripts/
├── generate_mesh.py     # Main script — called by backend/services/mesh_service.py
├── test_generate.py     # Test runner — run this to verify your pipeline works
└── base_mesh/
    ├── README.md        # Instructions for base mesh files
    └── *.blend          # Your Blender base mesh files go here (not committed until ready)
```

---

## Getting Started

### 1. Verify Blender is installed

```bash
blender --version
# Expected: Blender 3.6 or higher
```

### 2. Set BLENDER_PATH in .env

```env
# Windows example:
BLENDER_PATH=C:/Program Files/Blender Foundation/Blender 4.1/blender.exe

# Mac example:
BLENDER_PATH=/Applications/Blender.app/Contents/MacOS/Blender

# Linux example:
BLENDER_PATH=/usr/bin/blender
```

### 3. Run the test script

```bash
# From the project root
python blender-scripts/test_generate.py
```

This calls Blender with a sample payload for all 4 dress styles and checks
that `.gltf` and `.svg` files are created successfully.

---

## How the Script is Called

The backend (`mesh_service.py`) runs:

```bash
blender --background --python blender-scripts/generate_mesh.py -- '<json>'
```

The JSON argument has this shape:

```json
{
  "measurements": {
    "height": 165,
    "chest": 90,
    "waist": 70,
    "hip": 95,
    "shoulder": 40,
    "sleeveLength": 55
  },
  "style": "kurta",
  "image_url": "/files/abc123_enhanced.png",
  "gltf_output": "/absolute/path/output.gltf",
  "svg_output": "/absolute/path/output.svg"
}
```

Parse it in your script with:
```python
import sys, json
args = json.loads(sys.argv[sys.argv.index("--") + 1])
```

---

## Implementation Checklist

- [ ] Replace the placeholder cylinder body mesh with a real rigged human mesh
- [ ] Add shape keys to body mesh driven by measurement values
- [ ] Replace placeholder dress geometry per style (kurta, ghagra, blouse_saree, daily_wear)
- [ ] Test texture application with a real dress PNG
- [ ] Verify UV unwrap produces clean, non-overlapping islands
- [ ] Check SVG die-line output has correct labeled panels
- [ ] Test GLTF loads correctly in the browser (drag into https://gltf-viewer.donmccurdy.com)
- [ ] Run `test_generate.py` — all 4 styles should pass

---

## Supported Dress Styles

| Style ID | Description |
|---|---|
| `kurta` | Long top, 60% of height length |
| `ghagra` | Full flared skirt, 80% of height |
| `blouse_saree` | Fitted blouse, 25% of height |
| `daily_wear` | Simple dress, 55% of height |

Style IDs must match exactly what the frontend sends and what `data/styles.json` defines.

---

## Output Files

| File | Used By |
|---|---|
| `<uuid>.gltf` | Three.js in frontend — loaded by `MeshViewer.tsx` |
| `<uuid>.svg` | Frontend — displayed and downloaded in `DieLine.tsx` |

Both files are written to `backend/temp/` and served at `/files/<filename>`.

---

## Useful Blender Python References

- [bpy.ops.mesh docs](https://docs.blender.org/api/current/bpy.ops.mesh.html)
- [Shape Keys API](https://docs.blender.org/api/current/bpy.types.ShapeKey.html)
- [GLTF Export operator](https://docs.blender.org/api/current/bpy.ops.export_scene.html)
- [UV Export Layout](https://docs.blender.org/api/current/bpy.ops.uv.html#bpy.ops.uv.export_layout)
