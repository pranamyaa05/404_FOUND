"use client";

import { Suspense, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF, Environment } from "@react-three/drei";
import { useStudioStore } from "@/store/studioStore";
import { generateMesh } from "@/lib/api";
import { fireBobMessage } from "@/hooks/useBobProactive";

interface Props {
  onNext: () => void;
  onBack: () => void;
}

/**
 * Renders the GLTF mesh returned from the backend Blender pipeline.
 *
 * Owner: Member 1 & 2 (3D mesh)
 * TODO: Replace the placeholder cube with the actual GLTF model once
 *       /generate-mesh endpoint is working.
 */
function Model({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  return <primitive object={scene} scale={1.5} />;
}

function PlaceholderModel() {
  return (
    <mesh>
      <boxGeometry args={[1, 2, 0.5]} />
      <meshStandardMaterial color="#9B6DFF" wireframe />
    </mesh>
  );
}

export default function MeshViewer({ onNext, onBack }: Props) {
  const { measurements, selectedStyle, enhancedImage, setMeshUrl, meshUrl } =
    useStudioStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!measurements || !selectedStyle) return;

    const fetchMesh = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await generateMesh(measurements as unknown as Record<string, number>, selectedStyle, enhancedImage);
        setMeshUrl(result.gltf_url);
        // Tell BOB the mesh is ready — fires a fabric suggestion nudge
        const { skinTone, measurements: m } = useStudioStore.getState();
        const heightNote =
          m && m.height < 155 ? " Since you're petite, lighter fabrics will drape better."
          : m && m.height > 170 ? " Your height suits dramatic floor-length styles perfectly."
          : "";
        fireBobMessage({
          text: `Your 3D model is ready! ${heightNote}\n\nWant me to suggest the best fabric for this style based on your skin tone?`,
          quickReplies: [
            skinTone ? `Suggest fabrics for ${skinTone.displayName} skin` : "Suggest fabrics",
            "What colours work for me?",
            "How does this look for a wedding?",
          ],
        });
      } catch (err) {
        setError("Could not generate mesh. Showing placeholder preview.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchMesh();
  }, [measurements, selectedStyle, enhancedImage, setMeshUrl]);

  return (
    <div className="card">
      <h2 className="font-serif italic text-3xl text-surface-dark mb-2">3D Preview</h2>
      <p className="text-surface-dark/60 mb-6">
        Rotate and inspect your dress on a 3D body model.
      </p>

      {isLoading && (
        <div className="flex items-center justify-center h-64 text-surface-dark/60 animate-pulse font-serif italic">
          Generating 3D mesh via Blender...
        </div>
      )}

      {!isLoading && (
        <div className="w-full h-[500px] rounded-xl overflow-hidden bg-surface-cream border border-dashed border-surface-dark/20 mb-6">
          <Canvas camera={{ position: [0, 1, 4], fov: 50 }}>
            <ambientLight intensity={0.6} />
            <directionalLight position={[5, 10, 5]} intensity={1} />
            <Environment preset="city" />
            <Suspense fallback={null}>
              {meshUrl ? <Model url={meshUrl} /> : <PlaceholderModel />}
            </Suspense>
            <OrbitControls enablePan={false} minDistance={2} maxDistance={10} />
          </Canvas>
        </div>
      )}

      {error && (
        <p className="text-yellow-600 text-sm mb-4">{error}</p>
      )}

      <div className="flex gap-4">
        <button onClick={onBack} className="btn-outline flex-1">
          ← Back
        </button>
        <button
          onClick={onNext}
          disabled={isLoading}
          className="btn-primary flex-1"
        >
          Get Pattern →
        </button>
      </div>
    </div>
  );
}
