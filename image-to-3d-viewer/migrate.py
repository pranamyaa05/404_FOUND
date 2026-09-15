import shutil
import os

src = r"d:\RVCE\Sem 3\IBM SkillsBuild\3D\image-to-3d-viewer\MP\MorphoPackEngine\pipeline.py"
dst = r"d:\RVCE\Sem 3\IBM SkillsBuild\3D\image-to-3d-viewer\backend\blender_pipeline.py"
shutil.copy2(src, dst)

# Also delete the MP folder
mp_dir = r"d:\RVCE\Sem 3\IBM SkillsBuild\3D\image-to-3d-viewer\MP"
try:
    # Need to handle readonly files like .git
    import stat
    def remove_readonly(func, path, excinfo):
        os.chmod(path, stat.S_IWRITE)
        func(path)
    shutil.rmtree(mp_dir, onerror=remove_readonly)
    print("Deleted MP folder.")
except Exception as e:
    print(f"Error deleting MP: {e}")
