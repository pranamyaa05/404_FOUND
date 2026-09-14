import shutil
import os

workspace = r"d:\RVCE\Sem 3\IBM SkillsBuild\3D\image-to-3d-viewer\backend"
src = os.path.join(workspace, "blender_pipeline.py")
dst = os.path.join(workspace, "blender_pipeline_improved.py")

with open(src, "r", encoding="utf-8") as f:
    content = f.read()

# Make the angle epsilon huge so it stops shattering the mesh into tiny triangles!
content = content.replace("angle_epsilon = 0.001", "angle_epsilon = 3.14  # Don't shatter curved edges")

# Disable pagination and set a safe canvas size
content = content.replace("limit_by_page=True", "limit_by_page=False")
content = content.replace("output_size_x = 0.297", "output_size_x = 2.0")
content = content.replace("output_size_y = 0.420", "output_size_y = 2.0")
content = content.replace("output_size_x=0.297", "output_size_x=2.0")
content = content.replace("output_size_y=0.420", "output_size_y=2.0")

with open(dst, "w", encoding="utf-8") as f:
    f.write(content)
print("Created blender_pipeline_improved.py")
