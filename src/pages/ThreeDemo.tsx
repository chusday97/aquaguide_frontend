import React, { useRef, useState, useMemo } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';

function ThreeDCardFish({ imageUrl }: { imageUrl: string }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const texture = useLoader(THREE.TextureLoader, imageUrl);

  // Mouse hover state for rotation and lighting
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const [hovered, setHovered] = useState(false);

  // Automatically configure texture color space
  useMemo(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
  }, [texture]);

  // Handle pointer move over the container area
  const handlePointerMove = (e: React.PointerEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1; // -1 to 1
    const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1); // -1 to 1
    setMouse({ x, y });
  };

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    
    // 1. Gently tilt mesh towards mouse cursor
    if (meshRef.current) {
      const targetRotX = hovered ? mouse.y * 0.28 : 0;
      const targetRotY = hovered ? mouse.x * 0.32 : 0;
      meshRef.current.rotation.x = THREE.MathUtils.lerp(meshRef.current.rotation.x, targetRotX, 0.1);
      meshRef.current.rotation.y = THREE.MathUtils.lerp(meshRef.current.rotation.y, targetRotY, 0.1);

      // 2. Perform volumetric mathematical bulging on the vertices
      const geometry = meshRef.current.geometry as THREE.PlaneGeometry;
      const position = geometry.attributes.position;
      
      const width = 4.0;
      const height = 2.4;
      const widthHalf = width / 2;
      const heightHalf = height / 2;
      
      for (let i = 0; i < position.count; i++) {
        const x = position.getX(i);
        const y = position.getY(i);
        
        // Volumetric bulge: maximum in the middle, decays to 0 at the body bounds
        const bulgeX = Math.cos((x / widthHalf) * (Math.PI / 2));
        const bulgeY = Math.cos((y / heightHalf) * (Math.PI / 2));
        const volumetricDepth = bulgeX * bulgeY * 0.25; // Bulge thickness
        
        // Gentle tail-wiggle animation (mainly at the back of the fish body, x < 0)
        const factor = (widthHalf - x) / width; // 0 at head, 1 at tail
        const tailWiggle = Math.sin(x * 1.5 - time * 6.0) * 0.08 * factor;
        
        position.setZ(i, volumetricDepth + tailWiggle);
      }
      position.needsUpdate = true;
      geometry.computeVertexNormals();
    }

    // 3. Move point light to track mouse
    if (lightRef.current) {
      const targetLightX = mouse.x * 3.5;
      const targetLightY = mouse.y * 2.5;
      lightRef.current.position.x = THREE.MathUtils.lerp(lightRef.current.position.x, targetLightX, 0.15);
      lightRef.current.position.y = THREE.MathUtils.lerp(lightRef.current.position.y, targetLightY, 0.15);
    }
  });

  return (
    <>
      {/* Dynamic spot-highlight light tracking user cursor */}
      <pointLight
        ref={lightRef}
        position={[0, 0, 1.8]}
        intensity={hovered ? 2.5 : 1.2}
        distance={6}
        color="#ffffff"
      />
      
      {/* 3D mesh with fine geometry subdivisions */}
      <mesh
        ref={meshRef}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => {
          setHovered(false);
          setMouse({ x: 0, y: 0 });
        }}
        onPointerMove={handlePointerMove}
      >
        <planeGeometry args={[4, 2.4, 32, 32]} />
        <meshStandardMaterial
          map={texture}
          bumpMap={texture}
          bumpScale={0.015}
          roughness={0.2}
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

export function ThreeDemo() {
  // We showcase the Crowntail Betta (sp_0260) or Congo Tetra (sp_0020)
  const testSpeciesId = "sp_0260";
  const imgUrl = `/species-image-overrides/${testSpeciesId}.png`;

  return (
    <div className="min-h-screen w-full bg-slate-950 flex flex-col items-center justify-center p-8 text-white">
      <div className="max-w-md w-full bg-slate-900/60 border border-slate-800 rounded-3xl p-6 shadow-2xl backdrop-blur-xl">
        <h2 className="text-xl font-bold text-center mb-1 text-slate-100">
          物种详情 3D 预览 Demo
        </h2>
        <p className="text-xs text-slate-400 text-center mb-6">
          鼠标移入卡片查看立体反射、呼吸摆尾及视角偏移效果
        </p>

        {/* 3D Canvas container */}
        <div 
          className="w-full h-80 bg-slate-950/80 border border-slate-900 rounded-2xl relative overflow-hidden cursor-pointer"
          style={{ touchAction: 'none' }}
        >
          <Canvas camera={{ position: [0, 0, 3.2], fov: 50 }}>
            <ambientLight intensity={0.8} />
            <directionalLight position={[-2, 4, 2]} intensity={1.0} color="#cce6ff" />
            <ThreeDCardFish imageUrl={imgUrl} />
          </Canvas>
          
          {/* Decorative Glassmorphism Overlay */}
          <div className="absolute inset-0 pointer-events-none border border-white/5 rounded-2xl shadow-inner" />
        </div>

        <div className="mt-6 space-y-4">
          <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800/60">
            <h3 className="text-sm font-semibold text-emerald-400 mb-1">狮王斗鱼 (红黑)</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              基于原有的 2D 透明抠图图片，在 Canvas 中通过细分网格与顶点偏移，完成了鱼类腹部隆起膨胀的 volumetric 3D 立体感重建。
            </p>
          </div>
          <div className="flex justify-between items-center text-xs text-slate-400 px-1">
            <span>技术栈：R3F + WebGL</span>
            <span>状态：未推送 (本地预览)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
