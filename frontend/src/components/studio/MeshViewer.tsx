"use client";

import { Suspense, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF, Environment } from "@react-three/drei";
import { useStudioStore } from "@/store/studioStore";
import { generateMesh } from "@/lib/api";

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
        const result = await generateMesh(measurements, selectedStyle, enhancedImage);
        setMeshUrl(result.gltf_url);
      } catch (err) {
        setError("Could not generate mesh. Showing placeholder preview.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchMesh();
  }, [measurements, selectedStyle, enhancedImage, setMeshUrl]);

  return (
    <div className="card bg-gray-900 border border-gray-700">
      <h2 className="text-2xl font-bold mb-2">3D Preview</h2>
      <p className="text-gray-400 mb-6">
        Rotate and inspect your dress on a 3D body model.
      </p>

      {isLoading && (
        <div className="flex items-center justify-center h-64 text-gray-400 animate-pulse">
          Generating 3D mesh via Blender...
        </div>
      )}

      {!isLoading && (
        <div className="w-full h-[500px] rounded-xl overflow-hidden bg-gray-800 mb-6">
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
        <p className="text-yellow-400 text-sm mb-4">{error}</p>
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
