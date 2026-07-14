import React, { useRef, useState, useMemo, Suspense } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';

function ThreeDCardFish({ imageUrl, width, height }: { imageUrl: string; width: number; height: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  
  // Handled smoothly with Suspense
  const texture = useLoader(THREE.TextureLoader, imageUrl);

  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const [hovered, setHovered] = useState(false);

  useMemo(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
  }, [texture]);

  const handlePointerMove = (e: React.PointerEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    setMouse({ x, y });
  };

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    if (meshRef.current) {
      const targetRotX = hovered ? mouse.y * 0.22 : 0;
      const targetRotY = hovered ? mouse.x * 0.26 : 0;
      meshRef.current.rotation.x = THREE.MathUtils.lerp(meshRef.current.rotation.x, targetRotX, 0.1);
      meshRef.current.rotation.y = THREE.MathUtils.lerp(meshRef.current.rotation.y, targetRotY, 0.1);

      const geometry = meshRef.current.geometry as THREE.PlaneGeometry;
      const position = geometry.attributes.position;
      
      const widthHalf = width / 2;
      const heightHalf = height / 2;
      
      for (let i = 0; i < position.count; i++) {
        const x = position.getX(i);
        const y = position.getY(i);
        
        const bulgeX = Math.cos((x / widthHalf) * (Math.PI / 2));
        const bulgeY = Math.cos((y / heightHalf) * (Math.PI / 2));
        const volumetricDepth = bulgeX * bulgeY * 0.28; 
        
        const factor = (widthHalf - x) / width; 
        const tailWiggle = Math.sin(x * 1.6 - time * 6.0) * 0.08 * factor;
        
        position.setZ(i, volumetricDepth + tailWiggle);
      }
      position.needsUpdate = true;
      geometry.computeVertexNormals();
    }

    if (lightRef.current) {
      const targetLightX = mouse.x * 3.5;
      const targetLightY = mouse.y * 2.5;
      lightRef.current.position.x = THREE.MathUtils.lerp(lightRef.current.position.x, targetLightX, 0.15);
      lightRef.current.position.y = THREE.MathUtils.lerp(lightRef.current.position.y, targetLightY, 0.15);
    }
  });

  return (
    <>
      <pointLight
        ref={lightRef}
        position={[0, 0, 1.8]}
        intensity={hovered ? 2.8 : 1.5}
        distance={6}
        color="#ffffff"
      />
      <mesh
        ref={meshRef}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => {
          setHovered(false);
          setMouse({ x: 0, y: 0 });
        }}
        onPointerMove={handlePointerMove}
      >
        <planeGeometry args={[width, height, 32, 32]} />
        <meshStandardMaterial
          map={texture}
          bumpMap={texture}
          bumpScale={0.015}
          roughness={0.25}
          metalness={0.12}
          transparent
          opacity={1}
          side={THREE.DoubleSide}
          alphaTest={0.02}
        />
      </mesh>
    </>
  );
}

export default function Interactive3DFishWrapper({ imageUrl, className }: { imageUrl: string; className?: string }) {
  return (
    <div className={className} style={{ touchAction: 'none' }}>
      <Suspense fallback={<div className="text-xs text-slate-400 flex items-center justify-center h-full w-full">3D 效果加载中...</div>}>
        <Canvas camera={{ position: [0, 0, 2.8], fov: 45 }}>
          <ambientLight intensity={1.0} />
          <directionalLight position={[-2, 4, 2]} intensity={0.6} color="#cce6ff" />
          <ThreeDCardFish imageUrl={imageUrl} width={3.2} height={2.0} />
        </Canvas>
      </Suspense>
    </div>
  );
}
