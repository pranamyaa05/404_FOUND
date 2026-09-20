"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import { useForm } from "react-hook-form";
import { useStudioStore } from "@/store/studioStore";
import SkinToneSelector from "@/components/studio/SkinToneSelector";
import { fireBobMessage } from "@/hooks/useBobProactive";
import { generateAvatar } from "@/lib/api";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";

interface Props {
  onNext: () => void;
  onBack: () => void;
}

export interface MeasurementValues {
  height: number;
  chest: number;
  waist: number;
  hip: number;
  shoulder: number;
  sleeveLength: number;
}

function AvatarModel({ url, skinHex }: { url: string; skinHex: string }) {
  const { scene: rawScene } = useGLTF(url);
  const { camera, controls } = useThree() as any;

  const modelScene = useMemo(() => {
    const cloned = rawScene.clone();
    cloned.traverse((n: any) => {
      if (n.isMesh) {
        n.castShadow = true;
        n.receiveShadow = true;
        if (n.geometry) {
          n.geometry.computeVertexNormals();
        }
        n.material = new THREE.MeshStandardMaterial({
          color: new THREE.Color(skinHex),
          roughness: 0.45,
          metalness: 0.05,
          side: THREE.DoubleSide,
        });
      }
    });
    return cloned;
  }, [rawScene, skinHex]);

  useEffect(() => {
    if (!modelScene) return;
    const box = new THREE.Box3().setFromObject(modelScene);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const s = 2 / Math.max(size.x, size.y, size.z);

    modelScene.scale.setScalar(s);
    modelScene.position.sub(center.multiplyScalar(s));
    modelScene.position.y += (size.y * s) / 2;

    if (camera) camera.position.set(0, 1.2, 3.2);
    if (controls) {
      controls.target.copy(modelScene.position);
      controls.update();
    }
  }, [modelScene, camera, controls]);

  return <primitive object={modelScene} />;
}

export default function MeasurementForm({ onNext, onBack }: Props) {
  const { measurements, setMeasurements, avatarUrl, setAvatarUrl, skinTone } = useStudioStore();
  const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<MeasurementValues>({
    defaultValues: measurements || {
      height: 165,
      chest: 90,
      waist: 75,
      hip: 95,
      shoulder: 40,
      sleeveLength: 58,
    },
  });

  const skinHex = skinTone?.hex || "#E8A87C";

  // Function to build / refresh avatar
  const handleUpdateAvatar = async () => {
    const values = getValues();
    setIsGeneratingAvatar(true);
    setAvatarError(null);
    try {
      const res = await generateAvatar({
        height: values.height || 165,
        chest: values.chest || 90,
        waist: values.waist || 75,
        hips: values.hip || 95,
      });
      setAvatarUrl(res.avatar_url);
    } catch (err: any) {
      setAvatarError(err.message || "Failed to generate body avatar.");
    } finally {
      setIsGeneratingAvatar(false);
    }
  };

  // Generate initial avatar on mount if none exists
  useEffect(() => {
    if (!avatarUrl) {
      handleUpdateAvatar();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async (data: MeasurementValues) => {
    setMeasurements(data);
    if (!avatarUrl) {
      await handleUpdateAvatar();
    }
    const { skinTone: currentSkin, selectedStyles } = useStudioStore.getState();
    const styleLabel = selectedStyles.length > 0 ? selectedStyles.join(" & ").replace(/_/g, " ") : "your chosen style";
    fireBobMessage({
      text: `Body avatar locked in! ${currentSkin ? `${currentSkin.displayName} skin tone` : ""} + **${data.height} cm** + **${styleLabel}** — ready for Step 4!`.trim(),
      quickReplies: [],
    });
    onNext();
  };

  const fields: { name: keyof MeasurementValues; label: string; min: number; max: number }[] = [
    { name: "height", label: "Height (cm)", min: 100, max: 250 },
    { name: "chest", label: "Chest / Bust (cm)", min: 50, max: 150 },
    { name: "waist", label: "Waist (cm)", min: 40, max: 150 },
    { name: "hip", label: "Hip (cm)", min: 50, max: 170 },
    { name: "shoulder", label: "Shoulder Width (cm)", min: 25, max: 70 },
    { name: "sleeveLength", label: "Sleeve Length (cm)", min: 10, max: 80 },
  ];

  return (
    <div className="card">
      <h2 className="font-serif italic text-3xl text-surface-dark mb-2">
        Custom Body Avatar & Measurements
      </h2>
      <p className="text-surface-dark/60 mb-6">
        Customize your body proportions and skin tone. Inspect the 3D avatar in real-time.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
        {/* Left Column: Controls & Inputs */}
        <div className="lg:col-span-7">
          <SkinToneSelector />

          <div className="stitch-divider my-4" />

          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              {fields.map((f) => (
                <div key={f.name}>
                  <label className="block text-xs font-medium text-surface-dark/80 mb-1">
                    {f.label}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    className="input-field py-1.5 text-sm"
                    {...register(f.name, {
                      required: "Required",
                      min: { value: f.min, message: `Min ${f.min} cm` },
                      max: { value: f.max, message: `Max ${f.max} cm` },
                      valueAsNumber: true,
                    })}
                  />
                  {errors[f.name] && (
                    <p className="text-red-500 text-xs mt-0.5">
                      {errors[f.name]?.message}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-3 mb-4">
              <button
                type="button"
                onClick={handleUpdateAvatar}
                disabled={isGeneratingAvatar}
                className="btn-outline flex-1 text-xs py-2"
              >
                {isGeneratingAvatar ? "Updating 3D Avatar..." : "↻ Recalculate 3D Body"}
              </button>
            </div>

            <div className="flex gap-4">
              <button type="button" onClick={onBack} className="btn-outline flex-1">
                ← Back
              </button>
              <button type="submit" className="btn-primary flex-1">
                Confirm & Fit Garment →
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Live SMPL 3D Body Avatar Viewport */}
        <div className="lg:col-span-5 flex flex-col">
          <div className="text-xs font-serif italic text-surface-dark/70 mb-1">
            Live 3D Body Avatar (SMPL Model)
          </div>

          <div
            className="w-full flex-1 min-h-[360px] rounded-xl overflow-hidden relative border border-surface-dark/10 shadow-sm"
            style={{ background: "#fbf8f0" }}
          >
            {isGeneratingAvatar && (
              <div className="absolute inset-0 bg-white/70 backdrop-blur-sm z-20 flex flex-col items-center justify-center p-4">
                <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mb-2" />
                <span className="text-xs font-serif italic text-surface-dark">
                  Generating SMPL Body Mesh...
                </span>
              </div>
            )}

            {avatarError && (
              <div className="absolute top-2 left-2 right-2 bg-red-50 text-red-700 p-2 rounded text-xs border border-red-200 z-20">
                {avatarError}
              </div>
            )}

            <Canvas camera={{ position: [0, 1.2, 3.2], fov: 42 }}>
              <ambientLight intensity={1.5} />
              <directionalLight position={[5, 10, 7]} intensity={2.5} castShadow />
              <directionalLight position={[-5, 5, -5]} intensity={1.2} />
              <directionalLight position={[0, 6, -6]} intensity={1.5} />
              <hemisphereLight groundColor={0x444455} color={0xffffff} intensity={0.8} />

              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, 0]} receiveShadow>
                <planeGeometry args={[20, 20]} />
                <shadowMaterial opacity={0.2} />
              </mesh>
              <gridHelper args={[16, 32, 0xcccccc, 0xe5e5e5]} />

              <Suspense fallback={null}>
                {avatarUrl && <AvatarModel url={avatarUrl} skinHex={skinHex} />}
              </Suspense>

              <OrbitControls enableDamping dampingFactor={0.06} makeDefault />
            </Canvas>

            <div className="absolute bottom-2 right-3 text-[10px] text-surface-dark/40 pointer-events-none">
              Rotate / Zoom to inspect body shape
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
