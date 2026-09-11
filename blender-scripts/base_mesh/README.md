# Base Mesh Assets

Place your Blender base mesh files here.

## Expected Files

| File | Purpose |
|---|---|
| `human_base.blend` | Rigged neutral human body mesh with shape keys |
| `kurta_base.blend` | Base cloth geometry for Kurta style |
| `ghagra_base.blend` | Base cloth geometry for Ghagra style |
| `blouse_saree_base.blend` | Base cloth geometry for Blouse-Saree style |
| `daily_wear_base.blend` | Base cloth geometry for casual daily wear |

## Shape Keys Convention

The body mesh should have shape keys named exactly as the measurement fields
so `generate_mesh.py` can drive them programmatically:

| Shape Key Name | Driven By |
|---|---|
| `Key_Chest` | `measurements.chest` |
| `Key_Waist` | `measurements.waist` |
| `Key_Hip` | `measurements.hip` |
| `Key_Shoulder` | `measurements.shoulder` |
| `Key_Height` | `measurements.height` |

## How to Link Base Mesh in Script

```python
# In generate_mesh.py, replace build_body_mesh() placeholder with:
bpy.ops.wm.open_mainfile(filepath="blender-scripts/base_mesh/human_base.blend")
body = bpy.data.objects["Body"]

# Then drive shape keys:
body.data.shape_keys.key_blocks["Key_Chest"].value = chest_factor
```

## Notes

- Keep `.blend` files under 50MB each — use linked libraries if larger
- Export textures as separate files (not embedded in blend)
- Test each base mesh with `blender --background --python generate_mesh.py -- '...'` before committing
