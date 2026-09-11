# StitchSmart — API Contract

This document is the single source of truth for what the frontend expects
from the backend. Any change to request/response shapes must be updated here.

---

## POST `/enhance-image`

**Owner:** Member 5  
**Content-Type:** `multipart/form-data`

### Request
| Field | Type | Description |
|---|---|---|
| `file` | File | PNG or JPG image of the dress |

### Response `200`
```json
{
  "enhanced_image_url": "/files/abc123_enhanced.png"
}
```

### Errors
| Code | Meaning |
|---|---|
| `400` | File is not PNG or JPG |
| `500` | Enhancement pipeline failed |

---

## POST `/generate-mesh`

**Owner:** Member 1 & 2  
**Content-Type:** `application/json`

### Request
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
  "enhanced_image_url": "/files/abc123_enhanced.png"
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `measurements` | object | ✅ | All values in cm |
| `style` | string | ✅ | One of: `kurta`, `blouse_saree`, `ghagra`, `daily_wear`, `anarkali`, `salwar_kameez` |
| `enhanced_image_url` | string | ❌ | URL from `/enhance-image` response. If null, mesh renders without texture. |

### Response `200`
```json
{
  "gltf_url": "/files/xyz789.gltf",
  "die_line_url": "/files/xyz789.svg"
}
```

### Errors
| Code | Meaning |
|---|---|
| `500` | Blender pipeline failed |

---

## POST `/chat`

**Owner:** Member 3 & 4  
**Content-Type:** `application/json`

### Request
```json
{
  "message": "What fabric suits a kurta for summer?",
  "session_id": "abc-123-def"
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `message` | string | ✅ | User's chat message |
| `session_id` | string | ❌ | Pass back the session_id from previous response to maintain context |

### Response `200`
```json
{
  "reply": "For summer, lightweight cotton or linen works best for kurtas...",
  "session_id": "abc-123-def"
}
```

**Important:** Frontend must store `session_id` and pass it in subsequent messages for Watson to maintain conversation history.

---

## POST `/recommend`

**Owner:** Member 3 & 4  
**Content-Type:** `application/json`

### Request
```json
{
  "skin_tone": "wheatish",
  "height_cm": 163,
  "occasion": "wedding"
}
```

| Field | Allowed Values |
|---|---|
| `skin_tone` | `fair` \| `wheatish` \| `dark` |
| `occasion` | `casual` \| `formal` \| `wedding` \| `festival` |

### Response `200`
```json
{
  "recommendations": [
    {
      "style": "Ghagra",
      "fabric": "Silk",
      "reason": "Deep jewel tones in silk complement warm skin tones beautifully for weddings."
    },
    {
      "style": "Anarkali Suit",
      "fabric": "Georgette",
      "reason": "Flowing georgette adds elegance and is forgiving for most body types."
    },
    {
      "style": "Salwar Kameez",
      "fabric": "Brocade",
      "reason": "Brocade adds richness suitable for a wedding setting."
    }
  ]
}
```

---

## GET `/styles`

**Owner:** Shared  

### Response `200`
Array of style objects from `data/styles.json`. See `data/README.md` for schema.

---

## Static Files

Generated GLTF and SVG files are served at:
```
GET /files/<filename>
```
Example: `GET /files/xyz789.gltf`
