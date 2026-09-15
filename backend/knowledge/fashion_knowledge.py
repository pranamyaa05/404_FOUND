"""
BOB's Fashion Knowledge Base
==============================
This is the single source of truth for all Indian fashion knowledge
that BOB uses to answer questions accurately.

ai_service.py imports this module and injects relevant sections
into the Watson / watsonx.ai prompt so BOB never misleads users.

Structure:
    STYLES          → per-style facts, fabrics, occasions, tailoring notes
    FABRICS         → fabric properties, care, best-for, avoid-for
    SKIN_TONE_GUIDE → colour and fabric guidance per skin tone
    HEIGHT_GUIDE    → silhouette advice per height range
    OCCASION_GUIDE  → what works for each occasion
    MEASUREMENT_GUIDE → how to take each measurement correctly
    TAILOR_GUIDE    → die-lines, seam allowance, panel terminology
    BOB_PERSONA     → the exact personality prompt injected into every call
"""

# ─────────────────────────────────────────────────────────────────────
# BOB's core persona — injected into every prompt
# ─────────────────────────────────────────────────────────────────────

BOB_PERSONA = """
You are BOB, an expert AI fashion consultant specialising in Indian ethnic wear.
You work inside the StitchSmart web application and help customers, tailors, and design students
make informed decisions about styles, fabrics, colours, measurements, and tailoring.

You have deep knowledge of: Kurta, Saree Blouse, Ghagra/Lehenga, Anarkali Suit, Salwar Kameez,
Daily Wear dresses, and all Indian fabrics (Cotton, Silk, Georgette, Chiffon, Linen, Brocade,
Velvet, Chanderi, Net, Rayon, Khadi, Organza, Bandhani). You know skin tone colour theory,
height-based silhouette advice, occasion dressing, measurement techniques, and tailoring
terminology (seam allowance, die-lines, grainline, kalis, darts, ease allowance).

--- HOW YOU TALK ---
- Warm, knowledgeable, and helpful. You are a trusted fashion advisor, not a generic chatbot.
- Give detailed, educational answers. When someone asks "explain Ghagra", give them origin,
  construction details, fabric recommendations, occasions, and care tips. Do not give one-liners.
- When someone asks "what style suits me?", use their profile (skin tone, height, occasion) to
  give a personalised, reasoned recommendation with specific fabric and colour suggestions.
- Be confident and opinionated. Say "go with silk for this" not "you might want to consider silk".
- If a question is about a specific garment or fabric, give rich factual detail from the knowledge base.
- If you genuinely do not know something, say so honestly and redirect to what you do know.
- Never make up fabric names, measurements, stitch counts, or technical facts.

--- STRICT RULES ---
- NEVER use any emoji characters in your responses. No unicode emoji at all. Use plain text only.
- Never ask for information the user already provided (skin tone, height, measurements, style).
- Always personalise answers using the user's profile data when available.
- Do not contradict facts provided in the knowledge base below.
- Do not recommend fabrics or colours that clash with the user's skin tone or occasion.

--- STITCHSMART APP STRUCTURE (IMPORTANT) ---
The StitchSmart web app has ONLY these pages and navigation items:
  1. Home page ("/") - Landing page with "Start Designing", "Ask BOB", "Explore Styles" buttons
  2. Studio ("/studio") - The main design workspace with steps: Style Selection, Image Upload,
     Measurements, 3D Preview, Pattern Download
  3. Style Guide ("/styles") - Browse and learn about Indian ethnic wear styles
  4. Suggest ("/suggest") - Get AI-powered style and fabric suggestions based on preferences
  5. The top navbar has: Studio, Style Guide, Ask BOB, and "Chat with BOB" button

CRITICAL: There is NO "Explore" tab, NO "Collections" tab, NO "Filter" feature, NO "Browse"
section, NO bottom navigation bar. NEVER tell users to go to tabs, sections, or features that
do not exist in the list above. If a user asks where to explore styles, direct them to the
"Style Guide" page or the "Suggest" page. If they want to start designing, direct them to "Studio".
""".strip()

# ─────────────────────────────────────────────────────────────────────
# Dress styles
# ─────────────────────────────────────────────────────────────────────

STYLES = {
    "kurta": {
        "full_name": "Kurta",
        "origin": "Pan-India",
        "description": (
            "A long top worn by all genders. Length falls between hip and knee. "
            "Side slits (called 'kali') from hip down are standard. "
            "Comes in straight cut, A-line, asymmetric, and high-low hem variants."
        ),
        "best_fabrics": ["Cotton", "Linen", "Chanderi", "Silk", "Georgette", "Rayon"],
        "occasions": ["Casual", "Office", "Festival", "Wedding"],
        "stitching_complexity": "Low–Medium",
        "key_measurements": ["height", "chest", "shoulder", "sleeve_length"],
        "common_necklines": ["Round neck", "V-neck", "Mandarin collar", "Keyhole"],
        "tailoring_notes": (
            "Length is measured from shoulder to hem. "
            "Standard ease allowance: 3–5 cm at chest. "
            "Slit height is typically 20–25 cm from hem. "
            "Embroidery panels need to be cut and attached separately."
        ),
        "care": {
            "Cotton": "Machine wash cold, iron while damp.",
            "Silk": "Dry clean or hand wash in cold water with mild detergent.",
            "Georgette": "Hand wash only, lay flat to dry.",
        },
    },
    "blouse_saree": {
        "full_name": "Saree Blouse",
        "origin": "Pan-India",
        "description": (
            "The fitted upper garment worn with a saree. "
            "Typically ends 15–18 cm below the bust. "
            "Back design (deep back, keyhole, tie-back) and neckline style vary widely. "
            "One of the most technically demanding garments to stitch."
        ),
        "best_fabrics": ["Silk", "Brocade", "Raw Silk", "Cotton", "Net", "Velvet", "Georgette"],
        "occasions": ["Wedding", "Festival", "Formal Function"],
        "stitching_complexity": "High",
        "key_measurements": ["chest", "waist", "shoulder", "sleeve_length", "blouse_back_length"],
        "common_necklines": ["Boat neck", "Square neck", "Sweetheart", "Halter", "Backless"],
        "tailoring_notes": (
            "Blouse length (front and back) must be marked separately. "
            "Back length is measured from neck to waist. "
            "Hook-and-eye count depends on back length — typically 5–7 hooks. "
            "Darts at bust and waist give the fitted shape. "
            "Padding can be added inside for structure."
        ),
        "care": {
            "Silk": "Dry clean strongly recommended.",
            "Brocade": "Dry clean only — water causes the metallic threads to tarnish.",
            "Cotton": "Hand wash in cold water.",
        },
    },
    "ghagra": {
        "full_name": "Ghagra / Lehenga",
        "origin": "Rajasthan, Gujarat (historically), now Pan-India for celebrations",
        "description": (
            "A full, flared skirt worn with a blouse (choli) and dupatta. "
            "The flare is determined by the number of fabric panels (kalis) — "
            "standard is 8–16 kalis. More kalis = more flare = heavier garment. "
            "Waistband is either elasticated or hooked."
        ),
        "best_fabrics": ["Silk", "Net", "Velvet", "Brocade", "Organza", "Georgette", "Bandhani"],
        "occasions": ["Wedding", "Festival (Navratri, Diwali)", "Grand Celebrations"],
        "stitching_complexity": "High",
        "key_measurements": ["waist", "hip", "height", "length_floor_to_waist"],
        "tailoring_notes": (
            "Length is measured from waist to floor (or desired length). "
            "Each kali (panel) is cut in a trapezoid/triangular shape. "
            "Seam allowance 1.5–2 cm per seam. "
            "Heavy fabrics like velvet need a lining (malmal or cotton) inside. "
            "Waistband must be reinforced with interfacing to hold the weight."
        ),
        "care": {
            "Silk": "Dry clean only.",
            "Georgette": "Dry clean or very gentle hand wash.",
            "Bandhani": "Hand wash cold — tie-dye can bleed slightly.",
        },
    },
    "anarkali": {
        "full_name": "Anarkali Suit",
        "origin": "Mughal era, popularised in North India",
        "description": (
            "A long flared kurta (resembling a frock) with a fitted bodice and wide flared hem, "
            "paired with churidar or palazzo pants. "
            "Named after the legendary court dancer Anarkali. "
            "Can be floor-length or mid-calf depending on style."
        ),
        "best_fabrics": ["Georgette", "Chiffon", "Silk", "Crepe", "Net", "Velvet"],
        "occasions": ["Wedding", "Festival", "Semi-Formal"],
        "stitching_complexity": "Medium–High",
        "key_measurements": ["height", "chest", "waist", "hip", "shoulder"],
        "tailoring_notes": (
            "Floor-length Anarkalis: heel height must be accounted for in final hem. "
            "Flare starts at waist or empire line depending on the cut. "
            "The bodice is lined and often has hidden hooks at the back. "
            "Net or chiffon layers are layered over an inner slip (not worn directly on skin)."
        ),
        "care": {
            "Georgette": "Dry clean or very gentle hand wash flat.",
            "Net": "Hand wash cold, do not wring.",
            "Silk": "Dry clean only.",
        },
    },
    "salwar_kameez": {
        "full_name": "Salwar Kameez",
        "origin": "Punjab (historically), now Pan-India",
        "description": (
            "Three-piece: kameez (top), salwar (trouser), dupatta (scarf). "
            "The most common everyday and semi-formal outfit across India. "
            "Kameez length, neckline, and sleeve style vary enormously."
        ),
        "best_fabrics": ["Cotton", "Linen", "Silk", "Georgette", "Chanderi", "Lawn"],
        "occasions": ["Casual", "Office", "Festival", "Formal"],
        "stitching_complexity": "Low–Medium",
        "key_measurements": ["height", "chest", "waist", "hip", "shoulder", "sleeve_length", "salwar_length"],
        "tailoring_notes": (
            "Salwar crotch depth = (hip / 4) + 2.5 cm. This is the most critical measurement. "
            "Kameez length is measured from shoulder to desired hem. "
            "Churidar variant: the trouser is cut longer and gathers at the ankle. "
            "Palazzo variant: wide-leg trouser, no gathers."
        ),
        "care": {
            "Cotton": "Machine wash cold.",
            "Lawn": "Hand wash cold — prone to shrinkage in hot water.",
            "Silk": "Dry clean.",
        },
    },
    "daily_wear": {
        "full_name": "Daily Wear Dress",
        "origin": "Pan-India contemporary",
        "description": (
            "Simple, comfortable dresses for everyday use. "
            "Common cuts: A-line, straight, wrap, shirt dress. "
            "Prioritises breathability and ease of movement."
        ),
        "best_fabrics": ["Cotton", "Linen", "Khadi", "Jersey", "Rayon", "Modal"],
        "occasions": ["Casual", "Home", "Informal Office"],
        "stitching_complexity": "Low",
        "key_measurements": ["height", "chest", "waist", "hip"],
        "tailoring_notes": (
            "Ease allowance of 3–5 cm is essential for daily comfort. "
            "Avoid heavy interfacing — keep it soft and relaxed. "
            "Pockets are always appreciated in daily wear. "
            "Zip or button closure at centre back is most common."
        ),
        "care": {
            "Cotton": "Machine wash warm.",
            "Linen": "Machine wash cold, air dry — tumble drying causes shrinkage.",
            "Rayon": "Hand wash cold or delicate machine cycle.",
        },
    },
}

# ─────────────────────────────────────────────────────────────────────
# Fabric knowledge
# ─────────────────────────────────────────────────────────────────────

FABRICS = {
    "Cotton": {
        "properties": "Breathable, absorbent, soft, easy to stitch. Slight shrinkage when washed.",
        "best_for": ["Casual wear", "Daily wear", "Summer", "Light kurtas", "Children's wear"],
        "avoid_for": ["Heavy grand occasions", "Draping sarees (plain cotton)"],
        "weight": "Light–Medium",
        "cost": "Low–Medium",
        "care": "Machine wash, iron while damp for best results.",
        "feel": "Soft and matte.",
    },
    "Silk": {
        "properties": "Lustrous, smooth, temperature-regulating, strong but delicate when wet.",
        "best_for": ["Weddings", "Formal events", "Saree blouses", "Ghagras", "Anarkalis"],
        "avoid_for": ["Everyday wear", "Active use — stains easily"],
        "weight": "Light–Medium",
        "cost": "High",
        "care": "Dry clean strongly recommended. If hand washing: cold water, no wringing.",
        "feel": "Smooth, cool, luxurious.",
    },
    "Georgette": {
        "properties": "Sheer, lightweight, flowy, slightly crinkled texture. Drapes beautifully.",
        "best_for": ["Anarkalis", "Saree blouses", "Flowy kurtas", "Dupatta"],
        "avoid_for": ["Structured garments", "Very casual wear"],
        "weight": "Light",
        "cost": "Medium",
        "care": "Dry clean or very gentle hand wash. Lay flat to dry.",
        "feel": "Airy and fluid.",
    },
    "Chiffon": {
        "properties": "Ultra-sheer, very lightweight, semi-transparent. Slippery — harder to stitch.",
        "best_for": ["Dupatta", "Overlay layers", "Blouse sleeves", "Evening wear"],
        "avoid_for": ["Beginners to stitch", "Everyday wear"],
        "weight": "Very light",
        "cost": "Medium",
        "care": "Hand wash cold or dry clean.",
        "feel": "Diaphanous, barely there.",
    },
    "Linen": {
        "properties": "Breathable, gets softer with each wash, slight texture. Wrinkles easily.",
        "best_for": ["Casual kurtas", "Daily wear", "Summer", "Office wear"],
        "avoid_for": ["Grand occasions", "Heavily embroidered pieces"],
        "weight": "Medium",
        "cost": "Medium",
        "care": "Machine wash cold. Air dry. Accept the wrinkles or iron while damp.",
        "feel": "Textured, crisp, cool.",
    },
    "Brocade": {
        "properties": "Heavy woven fabric with raised metallic patterns. Stiff and structured.",
        "best_for": ["Wedding blouses", "Ghagra waistbands", "Borders", "Ceremonial wear"],
        "avoid_for": ["Everyday wear", "Hot climates (retains heat)", "Draping styles"],
        "weight": "Heavy",
        "cost": "High",
        "care": "Dry clean only. Metallic threads tarnish with water.",
        "feel": "Rich, stiff, opulent.",
    },
    "Velvet": {
        "properties": "Thick, soft pile, rich colour depth. Heavy and warm.",
        "best_for": ["Winter weddings", "Ghagras", "Blouses", "Evening kurtas"],
        "avoid_for": ["Summer", "Humid climates", "Daily wear"],
        "weight": "Heavy",
        "cost": "Medium–High",
        "care": "Dry clean. Store hanging — folding creates permanent creases.",
        "feel": "Plush, luxurious, warm.",
    },
    "Chanderi": {
        "properties": "Lightweight with a subtle sheen, sheer body with silk or zari borders.",
        "best_for": ["Sarees", "Kurtas", "Dupattas", "Semi-formal occasions"],
        "avoid_for": ["Rough daily use — delicate"],
        "weight": "Light",
        "cost": "Medium–High",
        "care": "Dry clean or very gentle hand wash in cold water.",
        "feel": "Delicate, silky-matte with glimmer.",
    },
    "Net": {
        "properties": "Open mesh fabric, sheer and lightweight. Usually layered over lining.",
        "best_for": ["Ghagra layers", "Dupatta", "Anarkali overlays", "Blouse sleeves"],
        "avoid_for": ["Single-layer garments (too sheer)", "Rough wear"],
        "weight": "Very light",
        "cost": "Low–Medium",
        "care": "Hand wash cold. Do not wring.",
        "feel": "Airy, structured-sheer.",
    },
    "Rayon": {
        "properties": "Soft, drapes well, slightly shiny. Less breathable than cotton.",
        "best_for": ["Casual daily wear", "Printed kurtas", "Budget-friendly options"],
        "avoid_for": ["Heavy embroidery (too soft to support)", "Hot ironing"],
        "weight": "Light",
        "cost": "Low",
        "care": "Hand wash or delicate cycle cold.",
        "feel": "Smooth, cool-touch.",
    },
    "Khadi": {
        "properties": "Handspun cotton or silk. Slightly rough texture, very breathable, eco-friendly.",
        "best_for": ["Kurtas", "Daily wear", "Ethnic casual", "Statement pieces"],
        "avoid_for": ["Very formal occasions", "Draping styles"],
        "weight": "Medium",
        "cost": "Medium (handmade, supports artisans)",
        "care": "Hand wash cold. Air dry.",
        "feel": "Earthy, textured, artisanal.",
    },
}

# ─────────────────────────────────────────────────────────────────────
# Skin tone colour and fabric guide
# ─────────────────────────────────────────────────────────────────────

SKIN_TONE_GUIDE = {
    "very_fair": {
        "display": "Very Fair",
        "best_colors": [
            "Deep jewel tones (ruby, sapphire, emerald)",
            "Pastels (blush pink, lavender, mint)",
            "Navy and deep burgundy",
            "Warm gold and amber",
        ],
        "avoid_colors": [
            "Pale nude and beige (washes out)",
            "Very pale yellow",
            "White on white (no contrast)",
        ],
        "best_fabrics": ["Silk (adds luminosity)", "Georgette", "Chiffon"],
        "fabric_notes": "Sheer fabrics work beautifully — the skin shows through subtly.",
    },
    "fair": {
        "display": "Fair",
        "best_colors": [
            "Warm earth tones (terracotta, mustard, rust)",
            "Coral and peach",
            "Jewel tones",
            "Soft pinks and mauves",
        ],
        "avoid_colors": [
            "Very pale pastels (minimal contrast)",
            "Pure white (can look harsh)",
        ],
        "best_fabrics": ["Cotton", "Silk", "Chanderi"],
        "fabric_notes": "Most fabrics work well. Avoid very stiff fabrics that hide the silhouette.",
    },
    "wheatish": {
        "display": "Wheatish",
        "best_colors": [
            "Deep jewel tones (wine, teal, forest green, cobalt)",
            "Earthy warm tones (ochre, rust, brick)",
            "Rich pinks and fuchsia",
            "Gold and bronze metallics",
        ],
        "avoid_colors": [
            "Neon colours (too harsh)",
            "Beige and nude (too close to skin tone)",
            "Very pale pastels",
        ],
        "best_fabrics": ["Silk", "Georgette", "Chanderi", "Brocade"],
        "fabric_notes": (
            "Fabrics with a slight sheen (silk, chanderi) enhance warmth in the skin tone."
        ),
    },
    "medium_brown": {
        "display": "Medium Brown",
        "best_colors": [
            "Bold brights (electric blue, magenta, lime green)",
            "Deep warm tones (maroon, chocolate brown, burnt orange)",
            "White and off-white (high contrast, striking)",
            "Metallic gold and copper",
        ],
        "avoid_colors": [
            "Dark brown and very dark olive (blends into skin)",
            "Muted neutrals",
        ],
        "best_fabrics": ["Silk", "Brocade", "Cotton", "Rayon"],
        "fabric_notes": "High contrast colours work best. Bold metallic embroidery pops well.",
    },
    "dark_brown": {
        "display": "Dark Brown",
        "best_colors": [
            "Jewel brights (royal blue, emerald, purple, fuchsia)",
            "White, ivory, cream — all work beautifully",
            "Metallics (gold, silver)",
            "Vibrant reds and oranges",
        ],
        "avoid_colors": [
            "Very dark colours (navy on dark skin can lose definition)",
            "Dark grey",
        ],
        "best_fabrics": ["Silk", "Georgette", "Net overlays", "Brocade"],
        "fabric_notes": (
            "Embroidered and embellished fabrics look especially rich against dark skin."
        ),
    },
    "deep": {
        "display": "Deep",
        "best_colors": [
            "All bright and vibrant colours",
            "Crisp white and off-white",
            "Bold metallics",
            "Jewel tones",
            "Pastels also work with the right contrast",
        ],
        "avoid_colors": [
            "Very dark shades with low embellishment (lose detail)",
        ],
        "best_fabrics": ["Silk", "Brocade", "Organza", "Velvet"],
        "fabric_notes": (
            "Rich, heavily embellished fabrics are stunning. "
            "Velvet and brocade look especially opulent."
        ),
    },
}

# ─────────────────────────────────────────────────────────────────────
# Height guide
# ─────────────────────────────────────────────────────────────────────

HEIGHT_GUIDE = {
    "petite": {
        "range": "under 155 cm",
        "silhouette_advice": [
            "Avoid very heavy fabrics — they can overwhelm a petite frame.",
            "A-line and straight cuts elongate the silhouette.",
            "High waistlines create an illusion of length.",
            "Vertical prints and embroidery add height visually.",
            "Avoid very wide palazzo trousers — they shorten the legs.",
            "Floor-length ghagras work, but keep the waistband slim.",
        ],
        "best_styles": ["Straight Kurta", "Anarkali (empire waist)", "Fitted Salwar Kameez"],
        "avoid_styles": ["Very voluminous Ghagra (16+ kalis)", "Oversized boxy cuts"],
    },
    "average": {
        "range": "155–170 cm",
        "silhouette_advice": [
            "Almost all silhouettes work well at this height.",
            "Floor-length styles fall naturally.",
            "Can balance both fitted and flowy garments.",
        ],
        "best_styles": ["All styles"],
        "avoid_styles": [],
    },
    "tall": {
        "range": "above 170 cm",
        "silhouette_advice": [
            "Can carry dramatic silhouettes — floor-length ghagras, Anarkalis.",
            "Wide-leg palazzos look proportional.",
            "Avoid very short kurtas — they can look cropped.",
            "Long sleeves and maxi lengths look elegant.",
            "A-line and flared skirts are particularly flattering.",
        ],
        "best_styles": ["Ghagra / Lehenga", "Floor-length Anarkali", "Long Kurta", "Palazzo Suit"],
        "avoid_styles": ["Very short kurtas", "Cropped tops without structure below"],
    },
}

def get_height_category(height_cm: float) -> str:
    if height_cm < 155:
        return "petite"
    elif height_cm <= 170:
        return "average"
    else:
        return "tall"

# ─────────────────────────────────────────────────────────────────────
# Occasion guide
# ─────────────────────────────────────────────────────────────────────

OCCASION_GUIDE = {
    "casual": {
        "vibe": "Comfortable, relaxed, everyday.",
        "best_fabrics": ["Cotton", "Linen", "Khadi", "Rayon", "Jersey"],
        "avoid_fabrics": ["Brocade", "Velvet", "Heavy Silk"],
        "embellishment": "Minimal — simple prints, block prints, or solid colours.",
        "best_styles": ["Daily Wear Dress", "Kurta", "Salwar Kameez"],
    },
    "formal": {
        "vibe": "Professional, polished, semi-formal.",
        "best_fabrics": ["Cotton-Silk blend", "Chanderi", "Linen", "Georgette"],
        "avoid_fabrics": ["Velvet", "Heavy Net overlays", "Very casual cotton"],
        "embellishment": "Subtle — minimal embroidery, clean lines.",
        "best_styles": ["Straight Kurta", "Salwar Kameez", "Anarkali (muted tones)"],
    },
    "wedding": {
        "vibe": "Grand, celebratory, dressy. All-out is appropriate.",
        "best_fabrics": ["Silk", "Brocade", "Velvet", "Organza", "Net (layered)", "Georgette"],
        "avoid_fabrics": ["Plain Cotton", "Linen", "Jersey"],
        "embellishment": "Heavy embroidery, zari work, sequins, and mirror work all appropriate.",
        "best_styles": ["Ghagra / Lehenga", "Anarkali", "Saree Blouse", "Bridal Salwar Kameez"],
    },
    "festival": {
        "vibe": "Celebratory, colourful, traditional.",
        "best_fabrics": ["Cotton-Silk", "Chanderi", "Bandhani", "Georgette", "Silk"],
        "avoid_fabrics": ["Very heavy Velvet", "Stiff Brocade (for dancing festivals)"],
        "embellishment": "Mirror work, block prints, tie-dye (Bandhani), embroidery.",
        "best_styles": ["Kurta", "Ghagra (for Navratri)", "Anarkali", "Salwar Kameez"],
    },
}

# ─────────────────────────────────────────────────────────────────────
# Measurement guide (how to take each measurement correctly)
# ─────────────────────────────────────────────────────────────────────

MEASUREMENT_GUIDE = {
    "height": {
        "how_to": "Stand straight against a wall without shoes. Measure from floor to top of head.",
        "unit": "cm",
        "tip": "Always measure without footwear for accurate garment length.",
    },
    "chest": {
        "how_to": (
            "Measure around the fullest part of the chest/bust, keeping the tape parallel to the floor. "
            "Breathe normally — don't hold breath in or out."
        ),
        "unit": "cm",
        "tip": "For blouses, this is the most critical measurement. Add 2–4 cm ease for comfort.",
    },
    "waist": {
        "how_to": "Measure around the narrowest part of your torso, usually 2–3 cm above your navel.",
        "unit": "cm",
        "tip": "Don't suck in — a natural relaxed measurement gives better fit.",
    },
    "hip": {
        "how_to": (
            "Measure around the fullest part of the hips and buttocks, "
            "usually 18–23 cm below the waist."
        ),
        "unit": "cm",
        "tip": "This is critical for ghagra waistbands and salwar fit.",
    },
    "shoulder": {
        "how_to": "Measure from the edge of one shoulder to the other, across the back.",
        "unit": "cm",
        "tip": "This determines sleeve placement — wrong shoulder width makes the whole garment look off.",
    },
    "sleeve_length": {
        "how_to": (
            "Bend your arm slightly. Measure from the shoulder point down to the wrist "
            "(full sleeve) or desired length."
        ),
        "unit": "cm",
        "tip": "Full sleeve: to wrist. Three-quarter: to mid-forearm. Short: to mid-bicep.",
    },
}

# ─────────────────────────────────────────────────────────────────────
# Tailor guide (die-lines, patterns, seam allowance)
# ─────────────────────────────────────────────────────────────────────

TAILOR_GUIDE = {
    "seam_allowance": {
        "standard": "1.5 cm",
        "for_curves": "1 cm (easier to notch and ease)",
        "for_straight_seams": "1.5–2 cm",
        "explanation": (
            "Seam allowance is the extra fabric beyond the stitch line. "
            "StitchSmart patterns include 1.5 cm seam allowance on all edges. "
            "Do not add more — cut directly on the printed line."
        ),
    },
    "die_line_panels": {
        "kurta": ["Front body panel", "Back body panel", "Sleeve (x2)", "Collar/neckline facing"],
        "blouse_saree": ["Front body", "Back body", "Sleeve", "Back placket", "Dart strips"],
        "ghagra": ["Kali panels (x8 to x16)", "Waistband", "Blouse front", "Blouse back"],
        "anarkali": ["Bodice front", "Bodice back", "Flare panel (x4–8)", "Sleeve", "Lining"],
        "salwar_kameez": ["Kameez front", "Kameez back", "Sleeve", "Salwar front", "Salwar back"],
    },
    "print_instructions": (
        "Print at 100% scale (no 'fit to page'). "
        "Verify scale by measuring the 5 cm test square on the pattern sheet. "
        "Use tailor's chalk to trace panels onto fabric. "
        "Cut 1–2 mm outside the chalk line for safety."
    ),
    "grainline": (
        "The grainline arrow on each panel must run parallel to the selvedge of the fabric. "
        "Cutting off-grain causes the garment to twist and droop after washing."
    ),
}

# ─────────────────────────────────────────────────────────────────────
# Helper: build a compact context string for prompt injection
# ─────────────────────────────────────────────────────────────────────

def build_knowledge_context(
    skin_tone_label: str | None = None,
    height_cm: float | None = None,
    style: str | None = None,
    occasion: str | None = None,
) -> str:
    """
    Return a compact knowledge excerpt relevant to the user's profile.
    Injected into every BOB prompt so he answers from facts, not hallucinations.
    """
    sections: list[str] = []

    if skin_tone_label and skin_tone_label in SKIN_TONE_GUIDE:
        tone_data = SKIN_TONE_GUIDE[skin_tone_label]
        sections.append(
            f"SKIN TONE ({tone_data['display']}):\n"
            f"  Best colours: {', '.join(tone_data['best_colors'][:3])}\n"
            f"  Avoid: {', '.join(tone_data['avoid_colors'][:2])}\n"
            f"  Best fabrics: {', '.join(tone_data['best_fabrics'])}\n"
            f"  Note: {tone_data['fabric_notes']}"
        )

    if height_cm:
        cat = get_height_category(height_cm)
        h_data = HEIGHT_GUIDE[cat]
        sections.append(
            f"HEIGHT ({height_cm} cm — {cat}):\n"
            + "\n".join(f"  - {a}" for a in h_data["silhouette_advice"][:3])
        )

    if style and style in STYLES:
        s_data = STYLES[style]
        sections.append(
            f"SELECTED STYLE ({s_data['full_name']}):\n"
            f"  {s_data['description']}\n"
            f"  Best fabrics: {', '.join(s_data['best_fabrics'][:4])}\n"
            f"  Tailoring note: {s_data['tailoring_notes'][:200]}"
        )

    if occasion and occasion in OCCASION_GUIDE:
        o_data = OCCASION_GUIDE[occasion]
        sections.append(
            f"OCCASION ({occasion}):\n"
            f"  Vibe: {o_data['vibe']}\n"
            f"  Best fabrics: {', '.join(o_data['best_fabrics'][:4])}\n"
            f"  Avoid: {', '.join(o_data['avoid_fabrics'][:2])}"
        )

    return "\n\n".join(sections)
