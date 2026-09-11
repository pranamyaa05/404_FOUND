# StitchSmart — Shared Data

This folder contains static reference data shared across the frontend, backend, and AI services.

---

## Files

### `styles.json`

The single source of truth for all dress styles supported by the app.

**Used by:**
- `frontend/src/app/styles/page.tsx` — styles info page
- `frontend/src/components/studio/StylePicker.tsx` — style selection step
- `frontend/src/components/landing/StylesSection.tsx` — landing page preview
- `backend/routers/styles_router.py` — `GET /styles` endpoint
- `backend/services/ai_service.py` — context for AI recommendations

**Schema per entry:**

```json
{
  "id": "kurta",                          // used as style ID across the entire app
  "name": "Kurta",                        // display name
  "emoji": "👘",                          // shown in StylePicker UI
  "origin": "Pan-India",                  // regional origin
  "description": "...",                   // shown on /styles page
  "fabrics": ["Cotton", "Linen"],         // fabric options for AI recommendations
  "occasions": ["Casual", "Festival"],    // occasion tags
  "stitching_complexity": "Low–Medium",   // info for tailors / students
  "key_measurements": ["height", "chest"],// what the Blender script needs
  "notes": "..."                          // tailor-specific notes
}
```

---

## Adding a New Style

1. Add an entry to `styles.json` following the schema above
2. Make sure the `id` matches exactly in:
   - `blender-scripts/generate_mesh.py` (add a case in `build_dress_mesh()`)
   - `backend/routers/mesh_router.py` (update the style field description)
3. Test the full flow with the new style ID

---

## Adding More Data Files

If your feature needs reference data (e.g. fabric properties, color palettes,
regional style variations), add a new JSON file here and import it the same way
`styles.json` is imported in the frontend and backend.
