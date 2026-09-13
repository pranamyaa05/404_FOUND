"""
Garment Isolation Service
--------------------------
Privacy-preserving post-processor that runs immediately after rembg.

Public interface
----------------
    isolate_garment(rgba_np: np.ndarray, debug: bool = False) -> np.ndarray

Input:
    RGBA numpy array produced by rembg (person on transparent background).

Output:
    RGBA numpy array where face, hands, and visible non-garment body parts
    have been removed by zeroing the alpha channel.  The garment region is
    preserved.  The result is auto-cropped to the remaining garment bounding
    box with a small padding border.

Approach (all CPU, no API key, no GPU required)
------------------------------------------------
  Stage 1 — MediaPipe Pose
      Detect 33 body landmarks to locate head, hands, knees, ankles, feet.
      Build a convex-hull or ellipse exclusion mask per region.

  Stage 2 — YCrCb skin detection (constrained)
      Detect skin-coloured pixels ONLY within areas already marked as
      candidate body (not garment) by the landmark geometry.  This prevents
      skin-toned garments being accidentally erased.

  Stage 3 — Combine masks, zero alpha
      Apply the final exclusion mask to the alpha channel only.

  Stage 4 — Morphological cleanup
      Small close/open passes to remove stray transparent holes and stray
      opaque specks.

  Stage 5 — Auto-crop
      Crop to the garment bounding box + 5 % padding.

Failure handling
----------------
    Any exception during landmark detection returns the original rgba_np
    unmodified rather than producing a fully transparent image.

Debug mode
----------
    Pass debug=True to write intermediate PNG files to the system temp dir.
    Files are named garment_debug_<stage>.png.  This is never called from the
    production path.
"""

import os
import tempfile
import logging

import cv2
import numpy as np

logger = logging.getLogger(__name__)

# ── Lazy MediaPipe import ─────────────────────────────────────────────────────
# We import inside functions so that if mediapipe is not installed the rest of
# the backend still starts correctly (it will just skip garment isolation).
_mp_pose = None


def _get_mp_pose():
    global _mp_pose
    if _mp_pose is None:
        try:
            import mediapipe as mp  # type: ignore
            _mp_pose = mp.solutions.pose
        except ImportError:
            _mp_pose = None
    return _mp_pose


# ── Landmark indices (MediaPipe Pose 33-landmark model) ──────────────────────
# https://developers.google.com/mediapipe/solutions/vision/pose_landmarker

_LM = {
    "NOSE":           0,
    "LEFT_EYE":       2,
    "RIGHT_EYE":      5,
    "LEFT_EAR":       7,
    "RIGHT_EAR":      8,
    "MOUTH_LEFT":     9,
    "MOUTH_RIGHT":    10,
    "LEFT_SHOULDER":  11,
    "RIGHT_SHOULDER": 12,
    "LEFT_ELBOW":     13,
    "RIGHT_ELBOW":    14,
    "LEFT_WRIST":     15,
    "RIGHT_WRIST":    16,
    "LEFT_PINKY":     17,
    "RIGHT_PINKY":    18,
    "LEFT_INDEX":     19,
    "RIGHT_INDEX":    20,
    "LEFT_THUMB":     21,
    "RIGHT_THUMB":    22,
    "LEFT_HIP":       23,
    "RIGHT_HIP":      24,
    "LEFT_KNEE":      25,
    "RIGHT_KNEE":     26,
    "LEFT_ANKLE":     27,
    "RIGHT_ANKLE":    28,
    "LEFT_HEEL":      29,
    "RIGHT_HEEL":     30,
    "LEFT_FOOT_INDEX":31,
    "RIGHT_FOOT_INDEX":32,
}

_MIN_VISIBILITY = 0.4  # landmark visibility threshold


# ─────────────────────────────────────────────────────────────────────────────
# Public API
# ─────────────────────────────────────────────────────────────────────────────

def isolate_garment(rgba_np: np.ndarray, debug: bool = False) -> np.ndarray:
    """
    Remove non-garment human body parts from an RGBA image.

    Args:
        rgba_np: H×W×4 uint8 RGBA array (from rembg).
        debug:   If True, write intermediate images to tempdir.

    Returns:
        H×W×4 uint8 RGBA array with body parts zeroed in alpha channel,
        auto-cropped to garment bounding box.  Returns rgba_np unmodified
        on any error or when pose is not detectable.
    """
    mp_pose = _get_mp_pose()
    if mp_pose is None:
        logger.warning("[garment] mediapipe not available — skipping isolation")
        return rgba_np

    if rgba_np.ndim != 3 or rgba_np.shape[2] != 4:
        logger.warning("[garment] unexpected array shape %s — skipping", rgba_np.shape)
        return rgba_np

    height, width = rgba_np.shape[:2]
    rgb = rgba_np[:, :, :3].copy()
    alpha_orig = rgba_np[:, :, 3].copy()

    # ── Debug helper ─────────────────────────────────────────────────────────
    def _save_debug(name: str, img: np.ndarray):
        if not debug:
            return
        path = os.path.join(tempfile.gettempdir(), f"garment_debug_{name}.png")
        cv2.imwrite(path, img)
        logger.debug("[garment] debug → %s", path)

    _save_debug("01_rembg_rgba", cv2.cvtColor(rgba_np, cv2.COLOR_RGBA2BGRA))

    # ── Stage 1: MediaPipe Pose ───────────────────────────────────────────────
    try:
        with mp_pose.Pose(
            static_image_mode=True,
            model_complexity=1,        # 0=lite, 1=full, 2=heavy — balance speed/accuracy
            enable_segmentation=False,
            min_detection_confidence=0.4,
        ) as pose:
            results = pose.process(rgb)
    except Exception as exc:
        logger.warning("[garment] pose detection error: %s — returning original", exc)
        return rgba_np

    if not results.pose_landmarks:
        logger.info("[garment] no pose detected — returning original")
        return rgba_np

    landmarks = results.pose_landmarks.landmark

    # ── Helper: pixel coordinates from landmark ───────────────────────────────
    def px(name: str):
        """Return (x, y) pixel coords for a named landmark, or None if below threshold."""
        lm = landmarks[_LM[name]]
        if lm.visibility < _MIN_VISIBILITY:
            return None
        x = int(lm.x * width)
        y = int(lm.y * height)
        # clamp to image bounds
        x = max(0, min(width - 1, x))
        y = max(0, min(height - 1, y))
        return (x, y)

    # Initialise the exclusion mask (will accumulate all non-garment regions)
    exclude_mask = np.zeros((height, width), dtype=np.uint8)

    # ── Stage 2a: Head / face / hair ─────────────────────────────────────────
    _mask_head(exclude_mask, landmarks, px, height, width)

    # ── Stage 2b: Hands ──────────────────────────────────────────────────────
    _mask_hands(exclude_mask, landmarks, px, height, width)

    # ── Stage 2c: Legs / feet ────────────────────────────────────────────────
    _mask_legs(exclude_mask, landmarks, px, height, width)

    _save_debug("02_landmark_mask", exclude_mask)

    # ── Stage 3: Constrained YCrCb skin detection ────────────────────────────
    # Build a "candidate body region" mask that is slightly larger than the
    # landmark-based exclusion mask.  Skin detection only applies within this
    # region, preventing skin-coloured garments from being erased.
    candidate_body = _dilate(exclude_mask, ksize=31)
    skin_mask = _detect_skin(rgb)
    skin_mask = cv2.bitwise_and(skin_mask, candidate_body)

    # Neck skin: refine with a region between head bbox bottom and shoulder line
    neck_skin = _mask_neck_skin(skin_mask, landmarks, px, height, width, exclude_mask)
    exclude_mask = cv2.bitwise_or(exclude_mask, neck_skin)

    # Merge skin-detected pixels from hands/legs candidate zones into exclusion
    exclude_mask = cv2.bitwise_or(exclude_mask, skin_mask)

    _save_debug("03_skin_mask", skin_mask)
    _save_debug("04_combined_exclude", exclude_mask)

    # ── Stage 4: Apply exclusion to alpha ────────────────────────────────────
    alpha = alpha_orig.copy()
    alpha[exclude_mask > 0] = 0

    # ── Stage 5: Morphological cleanup ───────────────────────────────────────
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))

    # Close small transparent holes inside the garment
    garment_alpha = cv2.morphologyEx(alpha, cv2.MORPH_CLOSE, kernel, iterations=1)

    # Remove tiny stray opaque specks outside the garment
    garment_alpha = cv2.morphologyEx(garment_alpha, cv2.MORPH_OPEN, kernel, iterations=1)

    # Subtle 1-px feather at boundaries
    garment_alpha = cv2.GaussianBlur(garment_alpha, (3, 3), sigmaX=0.8)

    # Restore hard edges of the exclusion mask (do not soften erased areas back in)
    garment_alpha[exclude_mask > 0] = 0

    _save_debug("05_garment_alpha", garment_alpha)

    # ── Stage 6: Reconstruct RGBA ────────────────────────────────────────────
    result = np.dstack([rgb, garment_alpha]).astype(np.uint8)

    # ── Stage 7: Auto-crop to garment ────────────────────────────────────────
    result = _autocrop(result, rgba_np)

    _save_debug("06_final_garment", cv2.cvtColor(result, cv2.COLOR_RGBA2BGRA))

    return result


# ─────────────────────────────────────────────────────────────────────────────
# Region masking helpers
# ─────────────────────────────────────────────────────────────────────────────

def _mask_head(mask: np.ndarray, landmarks, px, height: int, width: int):
    """
    Build a convex-hull exclusion mask around the head region.

    Uses NOSE, LEFT_EAR, RIGHT_EAR, LEFT_EYE, RIGHT_EYE, MOUTH_LEFT,
    MOUTH_RIGHT.  Expands the hull upward to cover hair.
    """
    head_names = ["NOSE", "LEFT_EAR", "RIGHT_EAR", "LEFT_EYE", "RIGHT_EYE",
                  "MOUTH_LEFT", "MOUTH_RIGHT"]
    pts = [p for p in (px(n) for n in head_names) if p is not None]

    if len(pts) < 3:
        # Fallback: use nose only with a radius scaled to image width
        nose = px("NOSE")
        if nose is None:
            return
        r = int(width * 0.18)
        cv2.circle(mask, nose, r, 255, thickness=-1)
        return

    pts_arr = np.array(pts, dtype=np.int32)

    # bounding box of the facial landmarks
    x_min, y_min = pts_arr[:, 0].min(), pts_arr[:, 1].min()
    x_max, y_max = pts_arr[:, 0].max(), pts_arr[:, 1].max()
    face_w = max(x_max - x_min, 1)
    face_h = max(y_max - y_min, 1)

    # Expand: outward by 25% horizontally, upward by 80% to cover hair,
    # downward by 10% (below chin) but do NOT extend very far down into neck.
    pad_x  = int(face_w * 0.30)
    pad_up = int(face_h * 0.85)   # generous for hair
    pad_dn = int(face_h * 0.12)   # conservative — keeps neckline garment safe

    x1 = max(0, x_min - pad_x)
    x2 = min(width - 1,  x_max + pad_x)
    y1 = max(0, y_min - pad_up)
    y2 = min(height - 1, y_max + pad_dn)

    # Draw as a filled ellipse to better approximate head shape
    cx = (x1 + x2) // 2
    cy = (y1 + y2) // 2
    ax = (x2 - x1) // 2
    ay = (y2 - y1) // 2
    cv2.ellipse(mask, (cx, cy), (ax, ay), 0, 0, 360, 255, thickness=-1)


def _mask_hands(mask: np.ndarray, landmarks, px, height: int, width: int):
    """
    Build exclusion ellipses around each detected hand.

    Uses WRIST + INDEX + PINKY to estimate hand size; scales the radius
    to the actual geometry rather than using fixed pixel values.
    """
    for side in ("LEFT", "RIGHT"):
        wrist = px(f"{side}_WRIST")
        index = px(f"{side}_INDEX")
        pinky = px(f"{side}_PINKY")
        thumb = px(f"{side}_THUMB")

        available = [p for p in [wrist, index, pinky, thumb] if p is not None]
        if not available:
            continue

        if wrist is None:
            # Can't anchor without wrist — use available points centroid
            center = np.mean(available, axis=0)
            r = int(width * 0.06)
            cv2.circle(mask, (int(center[0]), int(center[1])), r, 255, thickness=-1)
            continue

        pts = np.array(available, dtype=np.int32)
        cx = int(pts[:, 0].mean())
        cy = int(pts[:, 1].mean())

        # Radius = max distance from centroid to any detected point + 25%
        dists = np.linalg.norm(pts - np.array([cx, cy]), axis=1)
        r = max(int(dists.max() * 1.25), int(width * 0.04))

        cv2.circle(mask, (cx, cy), r, 255, thickness=-1)


def _mask_legs(mask: np.ndarray, landmarks, px, height: int, width: int):
    """
    Erase exposed legs and feet ONLY below the hem line.

    The hem is estimated as the midpoint between hips and knees unless
    knees are substantially lower than hips (long dress), in which case
    the hem is conservatively set near the ankle.

    For long garments (saree / ghagra), we avoid erasing anything visible
    between hip and ankle to preserve the lower garment.
    """
    left_hip    = px("LEFT_HIP")
    right_hip   = px("RIGHT_HIP")
    left_knee   = px("LEFT_KNEE")
    right_knee  = px("RIGHT_KNEE")
    left_ankle  = px("LEFT_ANKLE")
    right_ankle = px("RIGHT_ANKLE")
    left_heel   = px("LEFT_HEEL")
    right_heel  = px("RIGHT_HEEL")
    left_foot   = px("LEFT_FOOT_INDEX")
    right_foot  = px("RIGHT_FOOT_INDEX")

    hip_ys  = [p[1] for p in [left_hip, right_hip]   if p is not None]
    knee_ys = [p[1] for p in [left_knee, right_knee] if p is not None]

    if not hip_ys:
        return  # No hips detected — cannot determine hem line safely

    hip_y_mean  = int(np.mean(hip_ys))
    knee_y_mean = int(np.mean(knee_ys)) if knee_ys else None

    if knee_y_mean is not None:
        # Garment coverage heuristic:
        # If knees are within 30% of image height below hips → short garment
        # If knees are far below hips → likely a long garment covering the legs
        knee_gap = knee_y_mean - hip_y_mean
        if knee_gap < height * 0.30:
            # Short garment — use midpoint of hip→knee as hem estimate
            hem_y = hip_y_mean + int(knee_gap * 0.5)
        else:
            # Long garment — be very conservative; only erase below ankles
            ankle_ys = [p[1] for p in [left_ankle, right_ankle] if p is not None]
            if ankle_ys:
                hem_y = int(np.mean(ankle_ys)) - int(height * 0.02)
            else:
                return  # Cannot safely determine hem on long garment
    else:
        # No knee data; fallback to slightly below hip line
        hem_y = hip_y_mean + int(height * 0.08)

    hem_y = max(0, min(height - 1, hem_y))

    # Collect all foot/ankle points that are below the hem
    foot_pts = []
    for p in [left_knee, right_knee, left_ankle, right_ankle,
              left_heel, right_heel, left_foot, right_foot]:
        if p is not None and p[1] > hem_y:
            foot_pts.append(p)

    if not foot_pts:
        return

    # Build a convex hull around all sub-hem body points and fill
    pts_arr = np.array(foot_pts, dtype=np.int32)
    x_min = max(0, pts_arr[:, 0].min() - int(width * 0.05))
    x_max = min(width - 1, pts_arr[:, 0].max() + int(width * 0.05))

    # Fill a rectangle from hem_y to bottom of image between the legs
    # This is safer than a convex hull that could wrap around a long skirt
    y_top = hem_y
    y_bot = min(height - 1, pts_arr[:, 1].max() + int(height * 0.02))

    cv2.rectangle(mask, (x_min, y_top), (x_max, y_bot), 255, thickness=-1)


def _mask_neck_skin(skin_mask: np.ndarray, landmarks, px,
                    height: int, width: int,
                    existing_exclude: np.ndarray) -> np.ndarray:
    """
    Build a mask for exposed neck/decolletage skin between the head exclusion
    region and the shoulder line.  Only skin-coloured pixels in that band are
    included.
    """
    nose   = px("NOSE")
    l_sho  = px("LEFT_SHOULDER")
    r_sho  = px("RIGHT_SHOULDER")

    if nose is None or (l_sho is None and r_sho is None):
        return np.zeros_like(skin_mask)

    # Bottom of head exclusion ≈ nose y + 15% face height
    head_bottom_y = nose[1] + int(height * 0.07)

    sho_ys = [p[1] for p in [l_sho, r_sho] if p is not None]
    shoulder_y = int(np.mean(sho_ys))

    if shoulder_y <= head_bottom_y:
        return np.zeros_like(skin_mask)

    sho_xs = [p[0] for p in [l_sho, r_sho] if p is not None]
    neck_x1 = max(0, min(sho_xs) - int(width * 0.05))
    neck_x2 = min(width - 1, max(sho_xs) + int(width * 0.05))

    neck_band = np.zeros_like(skin_mask)
    cv2.rectangle(neck_band,
                  (neck_x1, head_bottom_y),
                  (neck_x2, shoulder_y),
                  255, thickness=-1)

    # Return only skin pixels within the neck band
    return cv2.bitwise_and(skin_mask, neck_band)


# ─────────────────────────────────────────────────────────────────────────────
# Skin detection (YCrCb range)
# ─────────────────────────────────────────────────────────────────────────────

def _detect_skin(rgb: np.ndarray) -> np.ndarray:
    """
    Detect likely skin pixels using YCrCb thresholding.

    Returns a uint8 mask (255 = skin, 0 = not skin).
    This mask must be constrained before use to avoid false positives on
    skin-toned garments.
    """
    ycrcb = cv2.cvtColor(rgb, cv2.COLOR_RGB2YCrCb)
    # Standard Chai-Ngan skin range — robust across skin tones
    lower = np.array([0,   133, 77],  dtype=np.uint8)
    upper = np.array([255, 173, 127], dtype=np.uint8)
    skin = cv2.inRange(ycrcb, lower, upper)
    # Small open to remove noise
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    skin = cv2.morphologyEx(skin, cv2.MORPH_OPEN, k, iterations=1)
    return skin


# ─────────────────────────────────────────────────────────────────────────────
# Utility helpers
# ─────────────────────────────────────────────────────────────────────────────

def _dilate(mask: np.ndarray, ksize: int) -> np.ndarray:
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (ksize, ksize))
    return cv2.dilate(mask, k, iterations=1)


def _autocrop(result: np.ndarray, fallback: np.ndarray, pad_frac: float = 0.05) -> np.ndarray:
    """
    Crop result to the bounding box of non-transparent pixels with padding.

    Returns fallback unchanged if fewer than 100 opaque pixels remain.
    """
    alpha = result[:, :, 3]
    ys, xs = np.where(alpha > 10)

    if len(ys) < 100:
        logger.warning("[garment] auto-crop: almost no garment pixels remain — returning original")
        return fallback

    h, w = result.shape[:2]
    y1, y2 = int(ys.min()), int(ys.max())
    x1, x2 = int(xs.min()), int(xs.max())

    pad_y = max(1, int((y2 - y1) * pad_frac))
    pad_x = max(1, int((x2 - x1) * pad_frac))

    y1 = max(0, y1 - pad_y)
    y2 = min(h - 1, y2 + pad_y)
    x1 = max(0, x1 - pad_x)
    x2 = min(w - 1, x2 + pad_x)

    return result[y1:y2 + 1, x1:x2 + 1]
