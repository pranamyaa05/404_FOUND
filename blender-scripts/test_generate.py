"""
Quick test script to verify the Blender pipeline works end-to-end.

Run from your terminal (NOT inside Blender):
    python blender-scripts/test_generate.py

This calls Blender headlessly with a sample payload and checks that
the output files were created successfully.

Requirements:
    - BLENDER_PATH set in .env  (or blender on your system PATH)
    - Blender 3.6+ installed
"""

import subprocess
import json
import os
import sys
import tempfile

# Load .env to get BLENDER_PATH
try:
    from dotenv import load_dotenv
    load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "../.env"))
except ImportError:
    pass  # run with blender on PATH

BLENDER_PATH = os.environ.get("BLENDER_PATH", "blender")
SCRIPT_PATH  = os.path.join(os.path.dirname(__file__), "generate_mesh.py")


def run_test(style: str, measurements: dict):
    with tempfile.TemporaryDirectory() as tmp:
        gltf_out = os.path.join(tmp, "test.gltf")
        svg_out  = os.path.join(tmp, "test.svg")

        args_json = json.dumps({
            "measurements": measurements,
            "style": style,
            "image_url": None,
            "gltf_output": gltf_out,
            "svg_output": svg_out,
        })

        cmd = [BLENDER_PATH, "--background", "--python", SCRIPT_PATH, "--", args_json]

        print(f"\n{'='*60}")
        print(f"Testing style: {style}")
        print(f"Command: {' '.join(cmd[:4])} -- <args>")
        print(f"{'='*60}")

        result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)

        print("STDOUT:", result.stdout[-1000:] if result.stdout else "(empty)")
        if result.stderr:
            print("STDERR:", result.stderr[-500:])

        if result.returncode != 0:
            print(f"❌ FAILED — exit code {result.returncode}")
            return False

        gltf_ok = os.path.exists(gltf_out)
        svg_ok  = os.path.exists(svg_out)

        print(f"GLTF created: {'✅' if gltf_ok else '❌'} ({gltf_out})")
        print(f"SVG  created: {'✅' if svg_ok  else '❌'} ({svg_out})")

        return gltf_ok and svg_ok


if __name__ == "__main__":
    sample_measurements = {
        "height": 165,
        "chest": 90,
        "waist": 70,
        "hip": 95,
        "shoulder": 40,
        "sleeveLength": 55,
    }

    styles_to_test = ["kurta", "ghagra", "blouse_saree", "daily_wear"]
    results = {}

    for s in styles_to_test:
        results[s] = run_test(s, sample_measurements)

    print(f"\n{'='*60}")
    print("TEST SUMMARY")
    print(f"{'='*60}")
    for s, ok in results.items():
        print(f"  {s:20s} {'✅ PASS' if ok else '❌ FAIL'}")

    all_passed = all(results.values())
    sys.exit(0 if all_passed else 1)
