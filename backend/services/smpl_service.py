"""
SMPL Parametric 3D Body Mesh Generator Service
------------------------------------------------
Generates custom 3D body GLB avatar meshes using SciPy optimization over
SMPL shape betas based on target body measurements (height, chest, waist, hips).
"""

import os
import json
import struct
import logging
import numpy as np
from scipy.optimize import minimize

logger = logging.getLogger(__name__)

_BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_PATH = os.path.join(_BACKEND_DIR, "models", "basicmodel_neutral_lbs_10_207_0_v1.1.0.npz")
TEMP_DIR = os.path.join(_BACKEND_DIR, "temp")


def export_mesh_to_glb(vertices, faces, output_path):
    """Encodes 3D vertices and indices directly into binary GLTF 2.0 (.glb) format."""
    vertices = np.array(vertices, dtype=np.float32)
    faces = np.array(faces, dtype=np.uint32)
    v_min, v_max = vertices.min(axis=0).tolist(), vertices.max(axis=0).tolist()

    v_bytes = vertices.tobytes()
    f_bytes = faces.tobytes()

    v_padding = (4 - (len(v_bytes) % 4)) % 4
    v_bytes += b'\x00' * v_padding
    f_padding = (4 - (len(f_bytes) % 4)) % 4
    f_bytes += b'\x00' * f_padding

    bin_chunk = v_bytes + f_bytes

    json_data = {
        "asset": {"version": "2.0"},
        "scenes": [{"nodes": [0]}],
        "nodes": [{"mesh": 0}],
        "meshes": [{"primitives": [{"attributes": {"POSITION": 1}, "indices": 0}]}],
        "buffers": [{"byteLength": len(bin_chunk)}],
        "bufferViews": [
            {"buffer": 0, "byteOffset": len(v_bytes), "byteLength": len(f_bytes), "target": 34963},
            {"buffer": 0, "byteOffset": 0, "byteLength": len(v_bytes), "target": 34962}
        ],
        "accessors": [
            {"bufferView": 0, "byteOffset": 0, "componentType": 5125, "count": faces.size, "type": "SCALAR"},
            {"bufferView": 1, "byteOffset": 0, "componentType": 5126, "count": vertices.shape[0], "type": "VEC3", "min": v_min, "max": v_max}
        ]
    }

    json_chunk = json.dumps(json_data).encode('utf-8')
    json_padding = (4 - (len(json_chunk) % 4)) % 4
    json_chunk += b' ' * json_padding

    with open(output_path, 'wb') as f:
        f.write(struct.pack('<4sII', b'glTF', 2, 12 + 8 + len(json_chunk) + 8 + len(bin_chunk)))
        f.write(struct.pack('<I4s', len(json_chunk), b'JSON'))
        f.write(json_chunk)
        f.write(struct.pack('<I4s', len(bin_chunk), b'BIN\x00'))
        f.write(bin_chunk)


def calculate_girths(v):
    """Calculates height, chest, waist, and hips girth from 3D vertex positions."""
    max_y = v[:, 1].max()

    def get_girth(target_y):
        mask = (np.abs(v[:, 1] - target_y) < 0.02) & (np.abs(v[:, 0]) < 0.25)
        pts = v[mask]
        if len(pts) == 0:
            return 0.0
        width = pts[:, 0].max() - pts[:, 0].min()
        depth = pts[:, 2].max() - pts[:, 2].min()
        return float(2 * np.pi * np.sqrt(((width / 2) ** 2 + (depth / 2) ** 2) / 2))

    return {
        'height': float(v[:, 1].max() - v[:, 1].min()),
        'chest': get_girth(max_y - 0.44),
        'waist': get_girth(max_y - 0.60),
        'hips': get_girth(max_y - 0.80)
    }


def generate_avatar_mesh(measurements: dict, output_glb_path: str) -> str:
    """
    Fits SMPL shape betas to target measurements (height, chest, waist, hips in cm)
    and saves the resulting body avatar mesh to output_glb_path.
    """
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(f"SMPL model parameters missing at {MODEL_PATH}")

    # Fallbacks in cm
    height_cm = float(measurements.get('height') or 165.0)
    chest_cm = float(measurements.get('chest') or 90.0)
    waist_cm = float(measurements.get('waist') or 75.0)
    hips_cm = float(measurements.get('hips') or 95.0)

    target = {
        'height': height_cm / 100.0,
        'chest': chest_cm / 100.0,
        'waist': waist_cm / 100.0,
        'hips': hips_cm / 100.0,
    }

    data = np.load(MODEL_PATH)
    v_template = data['v_template']
    shapedirs = data['shapedirs'][:, :, :10]  # Top 10 shape betas
    faces = data['f']

    def loss(betas):
        v = v_template + np.einsum('vdi,i->vd', shapedirs, betas)
        current_height = v[:, 1].max() - v[:, 1].min()
        scale = target['height'] / current_height
        v_scaled = v * scale

        m = calculate_girths(v_scaled)
        err = ((m['chest'] - target['chest']) ** 2 +
               (m['waist'] - target['waist']) ** 2 +
               (m['hips'] - target['hips']) ** 2)
        return err * 1000 + 0.05 * np.sum(betas ** 2)

    logger.info(f"[SMPL] Optimizing body avatar mesh for target measurements: {target}")
    res = minimize(loss, np.zeros(10), method='L-BFGS-B', options={'maxiter': 50})

    final_betas = res.x
    v = v_template + np.einsum('vdi,i->vd', shapedirs, final_betas)
    scale = target['height'] / (v[:, 1].max() - v[:, 1].min())
    v_scaled = v * scale

    os.makedirs(os.path.dirname(output_glb_path), exist_ok=True)
    export_mesh_to_glb(v_scaled, faces, output_glb_path)

    logger.info(f"[SMPL] Body avatar successfully generated at {output_glb_path}")
    return output_glb_path
