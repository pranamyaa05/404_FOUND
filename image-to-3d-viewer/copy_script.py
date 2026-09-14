import shutil
src = r"d:\RVCE\Sem 3\IBM SkillsBuild\3D\image-to-3d-viewer\backend\blender_pipeline.py"
dst = r"d:\RVCE\Sem 3\IBM SkillsBuild\3D\image-to-3d-viewer\backend\blender_pipeline_structured.py"
shutil.copy2(src, dst)
print("Copied successfully.")
