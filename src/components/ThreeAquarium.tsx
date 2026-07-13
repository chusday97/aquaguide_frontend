import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { Billboard, Html, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { Aquarium, Fish } from '../types';
import { fishData } from '../data/fishData';
import { getAquariumHardscapeSpecies, getAquariumPlantSpecies } from '../lib/speciesClassification';
import { getSpeciesDisplayImage } from '../lib/speciesVisual';

interface ThreeAquariumProps {
  aquarium: Aquarium;
  activeSpecies?: string | null;
  onSpeciesSelect?: (fishId: string | null) => void;
}

type SwimItem = {
  id: string;
  fishInfo: Fish;
  isLeader: boolean;
  quantity: number;
  speed: number;
  offset: number;
  lane: number;
};

type PlantRenderItem = {
  x: number;
  z: number;
  tone: string;
  delay: number;
  kind: string;
  surface: boolean;
  plantInfo: Fish | null;
};

type HardscapeRenderItem = {
  x: number;
  z: number;
  rotation: number;
  itemInfo: Fish;
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const useManagedTexture = (imageUrl: string) => {
  const sourceTexture = useLoader(THREE.TextureLoader, imageUrl);
  const texture = useMemo(() => {
    const nextTexture = sourceTexture.clone();
    nextTexture.colorSpace = THREE.SRGBColorSpace;
    nextTexture.anisotropy = 8;
    nextTexture.generateMipmaps = false;
    nextTexture.minFilter = THREE.LinearFilter;
    nextTexture.magFilter = THREE.LinearFilter;
    nextTexture.wrapS = THREE.ClampToEdgeWrapping;
    nextTexture.wrapT = THREE.ClampToEdgeWrapping;
    nextTexture.needsUpdate = true;
    return nextTexture;
  }, [sourceTexture]);

  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
};

const seededRandom = (seed: string) => {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 10000) / 10000;
};

const parseDimension = (value: string | undefined, fallback: number) => {
  const parsed = parseInt(value || '', 10);
  return Number.isFinite(parsed) ? clamp(parsed / 10, 3.8, 12) : fallback;
};

const useDocumentVisible = () => {
  const [visible, setVisible] = useState(() => (typeof document === 'undefined' ? true : document.visibilityState === 'visible'));

  useEffect(() => {
    const handleVisibilityChange = () => setVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  return visible;
};

const useIsMobileViewport = () => {
  const [isMobile, setIsMobile] = useState(() => (
    typeof window === 'undefined' ? false : window.matchMedia('(max-width: 767px)').matches
  ));

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const handleChange = () => setIsMobile(mediaQuery.matches);
    handleChange();
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return isMobile;
};

const useElementInView = (ref: React.RefObject<HTMLElement | null>) => {
  const [inView, setInView] = useState(true);

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.01 },
    );
    observer.observe(element);

    return () => observer.disconnect();
  }, [ref]);

  return inView;
};

function CappedRenderLoop({ active, fps }: { active: boolean; fps: number }) {
  const invalidate = useThree((state) => state.invalidate);
  const frameRef = useRef<number | null>(null);
  const lastRenderRef = useRef(0);

  useEffect(() => {
    if (!active) {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
      return;
    }

    const frameInterval = 1000 / fps;
    const tick = (now: number) => {
      if (now - lastRenderRef.current >= frameInterval) {
        lastRenderRef.current = now;
        invalidate();
      }
      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);

    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    };
  }, [active, fps, invalidate]);

  return null;
}

function RendererLifecycle() {
  const { gl, scene } = useThree();

  useEffect(() => () => {
    scene.traverse((object) => {
      const mesh = object as THREE.Mesh;
      mesh.geometry?.dispose?.();
      const material = mesh.material;
      if (Array.isArray(material)) {
        material.forEach((item) => item.dispose?.());
      } else {
        material?.dispose?.();
      }
    });
    gl.dispose();
  }, [gl, scene]);

  return null;
}

function CameraRig({ targetPosition }: { targetPosition: THREE.Vector3 | null }) {
  const { camera } = useThree();

  useFrame((_, delta) => {
    if (!targetPosition) return;

    const desiredPos = new THREE.Vector3(
      targetPosition.x + 1.8,
      targetPosition.y + 1.1,
      targetPosition.z + 3.4,
    );
    camera.position.lerp(desiredPos, delta * 2.4);
    camera.lookAt(targetPosition);
  });

  return null;
}

function TankFrame({ length, width, height, isSaltwater }: { length: number; width: number; height: number; isSaltwater: boolean }) {
  const rimColor = isSaltwater ? '#d8f4ff' : '#22352f';
  const glassColor = isSaltwater ? '#9fe6ff' : '#b9fff4';
  const bar = 0.08;
  const baseHeight = 0.16;

  return (
    <group>
      <mesh>
        <boxGeometry args={[length, height, width]} />
        <meshPhysicalMaterial
          color={glassColor}
          transparent
          opacity={0.18}
          roughness={0.08}
          metalness={0}
          transmission={0.72}
          thickness={0.45}
          ior={1.33}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      <mesh position={[0, -height / 2 - baseHeight / 2, 0]} receiveShadow>
        <boxGeometry args={[length + 0.35, baseHeight, width + 0.35]} />
        <meshStandardMaterial color="#1c201f" roughness={0.55} metalness={0.25} />
      </mesh>

      {[
        [0, height / 2 + bar / 2, width / 2 + bar / 2, length + 0.18, bar, bar],
        [0, height / 2 + bar / 2, -width / 2 - bar / 2, length + 0.18, bar, bar],
        [length / 2 + bar / 2, height / 2 + bar / 2, 0, bar, bar, width + 0.18],
        [-length / 2 - bar / 2, height / 2 + bar / 2, 0, bar, bar, width + 0.18],
        [length / 2 + bar / 2, 0, width / 2 + bar / 2, bar, height + 0.16, bar],
        [-length / 2 - bar / 2, 0, width / 2 + bar / 2, bar, height + 0.16, bar],
        [length / 2 + bar / 2, 0, -width / 2 - bar / 2, bar, height + 0.16, bar],
        [-length / 2 - bar / 2, 0, -width / 2 - bar / 2, bar, height + 0.16, bar],
      ].map(([x, y, z, sx, sy, sz], index) => (
        <mesh key={index} position={[x, y, z]}>
          <boxGeometry args={[sx, sy, sz]} />
          <meshStandardMaterial color={rimColor} roughness={0.35} metalness={0.32} />
        </mesh>
      ))}
    </group>
  );
}

function WaterVolume({ length, width, height, isSaltwater }: { length: number; width: number; height: number; isSaltwater: boolean }) {
  const waterColor = isSaltwater ? '#71d6ff' : '#76d8ce';

  return (
    <group>
      <mesh position={[0, -0.05, 0]}>
        <boxGeometry args={[length - 0.16, height - 0.22, width - 0.16]} />
        <meshPhysicalMaterial
          color={waterColor}
          transparent
          opacity={0.2}
          roughness={0.18}
          transmission={0.45}
          thickness={0.6}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>

      <mesh position={[0, height / 2 - 0.12, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[length - 0.18, width - 0.18, 24, 12]} />
        <meshStandardMaterial
          color={waterColor}
          transparent
          opacity={0.32}
          roughness={0.12}
          metalness={0.05}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {[-0.35, 0.1, 0.55].map((zOffset, index) => (
        <mesh key={index} position={[0, height / 2 - 0.2 - index * 0.03, zOffset]} rotation={[-Math.PI / 2, 0, 0.08 * index]}>
          <planeGeometry args={[length * 0.78, 0.025]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.18 - index * 0.03} />
        </mesh>
      ))}
    </group>
  );
}

function SubstrateBed({ length, width, height, substrate }: { length: number; width: number; height: number; substrate?: string }) {
  const hasSubstrate = substrate && substrate !== '无';
  const config = {
    '河沙': { color: '#c9a77c', accent: '#e3c69d', particle: 0.045, count: 7.2, height: 0.34 },
    '溪流砂': { color: '#9f8d77', accent: '#c7b69d', particle: 0.05, count: 7.4, height: 0.34 },
    '化妆砂': { color: '#eadfc6', accent: '#fff6df', particle: 0.035, count: 7.8, height: 0.3 },
    '水草泥': { color: '#2d2117', accent: '#4a3323', particle: 0.055, count: 7.5, height: 0.42 },
    '黑金沙': { color: '#191818', accent: '#34312d', particle: 0.04, count: 8.1, height: 0.34 },
    '陶粒': { color: '#8a4d2d', accent: '#b66b3f', particle: 0.075, count: 5.4, height: 0.42 },
    '碎石': { color: '#8b8d86', accent: '#b6b8ae', particle: 0.085, count: 6.1, height: 0.38 },
    '鹅卵石': { color: '#6f7774', accent: '#a8b0a8', particle: 0.13, count: 3.5, height: 0.42 },
    '珊瑚砂': { color: '#efe8d5', accent: '#fff6df', particle: 0.06, count: 6.8, height: 0.38 },
  }[substrate || '河沙'] || { color: '#c9a77c', accent: '#e3c69d', particle: 0.045, count: 7.2, height: 0.34 };
  const bedLength = length + 0.02;
  const bedWidth = width + 0.02;
  const bedY = -height / 2 + config.height / 2 + 0.02;
  const topY = -height / 2 + config.height + 0.08;

  const pebbles = useMemo(() => {
    const count = Math.min(360, Math.floor(length * width * config.count));
    return Array.from({ length: count }, (_, index) => {
      const sx = seededRandom(`pebble-x-${index}-${length}-${width}`);
      const sz = seededRandom(`pebble-z-${index}-${length}-${width}`);
      const ss = seededRandom(`pebble-s-${index}-${length}-${width}`);
      const tone = seededRandom(`pebble-tone-${index}-${substrate}`);
      const z = (sz - 0.5) * (width - 0.18);
      const frontLift = (z / (width - 0.18) + 0.5) * 0.08;
      return {
        x: (sx - 0.5) * (length - 0.18),
        z,
        yLift: frontLift + seededRandom(`pebble-y-${index}-${substrate}`) * 0.035,
        scale: config.particle * (0.65 + ss * 0.9),
        color: tone > 0.55 ? config.accent : config.color,
      };
    });
  }, [length, width, substrate, config.accent, config.color, config.count, config.particle]);

  if (!hasSubstrate) {
    return (
      <group>
        <mesh position={[0, -height / 2 + 0.035, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[length - 0.12, width - 0.12, 12, 8]} />
          <meshStandardMaterial color="#d8f4ef" transparent opacity={0.22} roughness={0.35} metalness={0.08} depthWrite={false} />
        </mesh>
        <mesh position={[0, -height / 2 + 0.04, width / 2 - 0.08]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[length - 0.18, 0.025]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.28} depthWrite={false} />
        </mesh>
      </group>
    );
  }

  return (
    <group>
      <mesh position={[0, bedY, 0]} rotation={[0.025, 0, 0]} receiveShadow>
        <boxGeometry args={[bedLength, config.height, bedWidth]} />
        <meshStandardMaterial color={config.color} roughness={0.92} />
      </mesh>

      {[
        [0, -height / 2 + config.height * 0.7, width / 2 + 0.01, bedLength, config.height * 0.95, 0.12],
        [0, -height / 2 + config.height * 0.62, -width / 2 - 0.01, bedLength, config.height * 0.72, 0.08],
        [length / 2 + 0.01, -height / 2 + config.height * 0.62, 0, 0.08, config.height * 0.72, bedWidth],
        [-length / 2 - 0.01, -height / 2 + config.height * 0.62, 0, 0.08, config.height * 0.72, bedWidth],
      ].map(([x, y, z, sx, sy, sz], index) => (
        <mesh key={`substrate-edge-${index}`} position={[x, y, z]} receiveShadow>
          <boxGeometry args={[sx, sy, sz]} />
          <meshStandardMaterial color={index === 0 ? config.accent : config.color} roughness={0.96} />
        </mesh>
      ))}

      <mesh position={[0, topY + 0.01, 0]} rotation={[-Math.PI / 2 + 0.025, 0, 0]}>
        <planeGeometry args={[bedLength, bedWidth, 24, 10]} />
        <meshStandardMaterial color={config.accent} transparent opacity={0.42} roughness={1} depthWrite={false} />
      </mesh>

      {['溪流砂', '化妆砂', '河沙', '珊瑚砂'].includes(substrate || '') && [-0.25, 0.1, 0.42].map((zOffset, index) => (
        <mesh key={`sand-ripple-${index}`} position={[0, topY + 0.03 + index * 0.004, zOffset]} rotation={[-Math.PI / 2 + 0.025, 0, index * 0.06]}>
          <planeGeometry args={[bedLength * 0.92, 0.035]} />
          <meshBasicMaterial color="#fff7df" transparent opacity={0.16} depthWrite={false} />
        </mesh>
      ))}

      {pebbles.map((pebble, index) => (
        <mesh key={index} position={[pebble.x, topY + pebble.yLift, pebble.z]} scale={[pebble.scale * 1.35, pebble.scale * 0.55, pebble.scale]}>
          <sphereGeometry args={[1, 8, 6]} />
          <meshStandardMaterial color={pebble.color} roughness={0.95} />
        </mesh>
      ))}
    </group>
  );
}

function AquaticPlant({ x, z, height, tone, delay, kind, surface = false }: { x: number; z: number; height: number; tone: string; delay: number; kind: string; surface?: boolean }) {
  const group = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!group.current) return;
    group.current.rotation.z = Math.sin(state.clock.elapsedTime * 1.1 + delay) * 0.055;
  });

  if (kind === '浮萍' || surface) {
    return (
      <group ref={group} position={[x, height / 2 - 0.16, z]}>
        {[0, 1, 2, 3, 4].map((leaf) => {
          const angle = leaf * 1.25 + delay;
          return (
            <mesh key={leaf} position={[Math.cos(angle) * 0.12, 0, Math.sin(angle) * 0.08]} rotation={[-Math.PI / 2, 0, angle]} scale={[0.11, 0.06, 0.012]}>
              <sphereGeometry args={[1, 12, 8]} />
              <meshStandardMaterial color="#78b852" roughness={0.65} />
            </mesh>
          );
        })}
      </group>
    );
  }

  if (kind === '莫斯') {
    return (
      <group ref={group} position={[x, -height / 2 + 0.34, z]}>
        {[0, 1, 2, 3, 4, 5].map((ball) => (
          <mesh key={ball} position={[(seededRandom(`${delay}-moss-x-${ball}`) - 0.5) * 0.42, 0.05 + ball * 0.015, (seededRandom(`${delay}-moss-z-${ball}`) - 0.5) * 0.28]} scale={[0.18, 0.08, 0.14]}>
            <dodecahedronGeometry args={[1, 1]} />
            <meshStandardMaterial color={ball % 2 ? '#2f7244' : '#4b8b50'} roughness={0.9} />
          </mesh>
        ))}
      </group>
    );
  }

  if (kind === '水兰') {
    return (
      <group ref={group} position={[x, -height / 2 + 0.3, z]}>
        {Array.from({ length: 7 }, (_, leaf) => (
          <mesh key={leaf} position={[(leaf - 3) * 0.045, 0.72, 0]} rotation={[0, 0, (leaf - 3) * 0.11]} scale={[0.035, 0.82 + leaf * 0.025, 0.012]}>
            <sphereGeometry args={[1, 12, 8]} />
            <meshStandardMaterial color="#3f8f54" roughness={0.72} />
          </mesh>
        ))}
      </group>
    );
  }

  if (kind === '皇冠草') {
    return (
      <group ref={group} position={[x, -height / 2 + 0.28, z]}>
        {Array.from({ length: 8 }, (_, leaf) => {
          const angle = (leaf / 8) * Math.PI * 2;
          return (
            <mesh key={leaf} position={[Math.cos(angle) * 0.18, 0.5, Math.sin(angle) * 0.12]} rotation={[0.18, angle, (leaf - 4) * 0.08]} scale={[0.12, 0.54, 0.018]}>
              <sphereGeometry args={[1, 14, 8]} />
              <meshStandardMaterial color="#5b9e49" roughness={0.7} />
            </mesh>
          );
        })}
      </group>
    );
  }

  if (kind === '椒草' || kind === '水榕' || kind === '辣椒榕') {
    const leafColor = kind === '辣椒榕' ? '#45533f' : kind === '椒草' ? '#506b3a' : '#477e48';
    const leafScale = kind === '水榕' ? [0.18, 0.33, 0.02] : [0.12, 0.28, 0.018];
    return (
      <group ref={group} position={[x, -height / 2 + 0.28, z]}>
        {Array.from({ length: 6 }, (_, leaf) => {
          const angle = (leaf / 6) * Math.PI * 2 + delay * 0.2;
          return (
            <mesh key={leaf} position={[Math.cos(angle) * 0.16, 0.28 + leaf * 0.035, Math.sin(angle) * 0.1]} rotation={[0.28, angle, 0.18]} scale={leafScale as [number, number, number]}>
              <sphereGeometry args={[1, 14, 8]} />
              <meshStandardMaterial color={leafColor} roughness={0.74} />
            </mesh>
          );
        })}
      </group>
    );
  }

  const isRedStem = kind === '红宫廷';
  const isFineLeaf = kind === '绿菊';

  return (
    <group ref={group} position={[x, -height / 2 + 0.28, z]}>
      {[0, 1, 2, 3].map((stem) => (
        <group key={stem} rotation={[0, (stem - 1) * 0.42, (stem - 1) * 0.04]} position={[(stem - 1) * 0.1, 0, 0]}>
          <mesh position={[0, 0.52 + stem * 0.06, 0]}>
            <cylinderGeometry args={[0.014, 0.024, 1.05 + stem * 0.12, 6]} />
            <meshStandardMaterial color={isRedStem ? '#8b3f38' : '#2d6a3e'} roughness={0.8} />
          </mesh>
          {isFineLeaf ? Array.from({ length: 5 }, (_, leaf) => (
            <mesh key={leaf} position={[(leaf - 2) * 0.045, 0.78 + stem * 0.08, 0]} rotation={[0, 0, (leaf - 2) * 0.45]} scale={[0.025, 0.22, 0.01]}>
              <sphereGeometry args={[1, 8, 6]} />
              <meshStandardMaterial color="#76b765" roughness={0.7} />
            </mesh>
          )) : (
            <>
              <mesh position={[0.12, 0.92 + stem * 0.08, 0]} rotation={[0, 0, -0.72]} scale={[0.12, 0.38, 0.018]}>
                <sphereGeometry args={[1, 10, 8]} />
                <meshStandardMaterial color={isRedStem ? '#b84c48' : tone} roughness={0.7} />
              </mesh>
              <mesh position={[-0.12, 0.68 + stem * 0.08, 0]} rotation={[0, 0, 0.72]} scale={[0.1, 0.32, 0.018]}>
                <sphereGeometry args={[1, 10, 8]} />
                <meshStandardMaterial color={isRedStem ? '#8f5244' : tone} roughness={0.7} />
              </mesh>
            </>
          )}
        </group>
      ))}
    </group>
  );
}

function AquaticPlantSprite({ plant, height }: { plant: PlantRenderItem; height: number }) {
  const group = useRef<THREE.Group>(null);
  const texture = useManagedTexture(getSpeciesDisplayImage(plant.plantInfo!));
  const aspect = texture.image ? texture.image.width / Math.max(texture.image.height, 1) : 1;
  const isCarpet = /莫斯|牛毛|矮珍珠|挖耳|箦藻/.test(plant.kind);
  const isFloating = plant.surface;
  const spriteHeight = isFloating ? 0.45 : isCarpet ? 0.58 : 0.9;
  const spriteWidth = clamp(spriteHeight * aspect, 0.44, 1.4);

  useFrame((state) => {
    if (!group.current) return;
    group.current.position.y += Math.sin(state.clock.elapsedTime * 1.4 + plant.delay) * 0.0008;
  });

  return (
    <Billboard
      ref={group}
      position={[plant.x, isFloating ? height / 2 - 0.18 : -height / 2 + spriteHeight / 2 + 0.18, plant.z]}
      follow
      lockX={false}
      lockY={false}
      lockZ={false}
    >
      <mesh scale={[spriteWidth, spriteHeight, 1]} renderOrder={5}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          map={texture}
          transparent
          alphaTest={0.05}
          side={THREE.DoubleSide}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </Billboard>
  );
}

function PlantGarden({ plants, length, width, height }: { plants?: string[]; length: number; width: number; height: number }) {
  const tones = ['#3f8f54', '#5fae63', '#2f7448', '#79a65f'];
  const generatedPlants = useMemo(() => {
    if (!plants || plants.length === 0) return [];
    return plants.flatMap((plant, plantIndex) => {
      const plantInfo = getAquariumPlantSpecies(plant, fishData);
      const plantName = plantInfo?.name || plant;
      const count = /浮萍|圆心萍/.test(plantName) ? 4 : /莫斯|牛毛|矮珍珠|挖耳草/.test(plantName) ? 3 : 2;
      return Array.from({ length: count }, (_, index) => {
        const seed = `${plantName}-${plantIndex}-${index}-${plants.join(',')}`;
        const preferBack = /水兰|蜈蚣|宫廷|皇冠|绿羽毛|睡莲|大浪/.test(plantName);
        const preferFront = /莫斯|椒草|榕|矮珍珠|牛毛|挖耳|箦藻/.test(plantName);
        const zSeed = seededRandom(`plant-z-${seed}`);
        return {
          x: (seededRandom(`plant-x-${seed}`) - 0.5) * (length - 1),
          z: preferBack ? -width * 0.28 + zSeed * width * 0.22 : preferFront ? (zSeed - 0.5) * width * 0.42 : (zSeed - 0.5) * (width - 0.7),
          tone: tones[(plantIndex + index) % tones.length],
          delay: (plantIndex * 3 + index) * 0.8,
          kind: plantName,
          surface: /浮萍|圆心萍/.test(plantName),
          plantInfo,
        };
      });
    }).slice(0, 28);
  }, [plants, length, width]);

  if (generatedPlants.length === 0) return null;

  return (
    <group>
      {generatedPlants.map((plant, index) => (
        plant.plantInfo ? (
          <AquaticPlantSprite key={index} plant={plant} height={height} />
        ) : (
          <AquaticPlant key={index} {...plant} height={height} />
        )
      ))}
    </group>
  );
}

function EquipmentSystem({
  length,
  width,
  height,
  equipment,
  isSaltwater,
}: {
  length: number;
  width: number;
  height: number;
  equipment?: Aquarium['equipment'];
  isSaltwater: boolean;
}) {
  const filter = equipment?.filter ?? '瀑布过滤';
  const hasFilter = filter !== '无';
  const hasHeater = equipment?.heater ?? true;
  const hasOxygen = equipment?.oxygen ?? false;
  const light = equipment?.light ?? (isSaltwater ? '海水灯' : '普通灯');

  return (
    <group>
      {light !== '无' && (
        <group position={[0, height / 2 + 0.18, 0]}>
          <mesh>
            <boxGeometry args={[length * 0.62, 0.08, 0.12]} />
            <meshStandardMaterial color={light === '海水灯' ? '#d6f4ff' : light === '水草灯' ? '#e4ffd8' : '#fff4cf'} emissive={light === '海水灯' ? '#6dc8ff' : '#ffe7a1'} emissiveIntensity={0.55} roughness={0.35} />
          </mesh>
          <pointLight intensity={light === '海水灯' ? 1.15 : 0.82} distance={8} color={light === '水草灯' ? '#d6ffca' : light === '海水灯' ? '#c7f2ff' : '#fff5d8'} />
        </group>
      )}

      {hasFilter && (
        <group position={[length / 2 - 0.35, height / 2 - 0.85, -width / 2 - 0.08]}>
          <mesh position={[0.08, 0.06, -0.08]}>
            <boxGeometry args={[0.58, 1.02, 0.28]} />
            <meshStandardMaterial color="#202927" roughness={0.5} metalness={0.18} />
          </mesh>
          <mesh position={[0.08, 0.12, -0.225]}>
            <boxGeometry args={[0.5, 0.74, 0.035]} />
            <meshStandardMaterial color="#4a5955" roughness={0.8} />
          </mesh>
          {[-0.16, 0, 0.16].map((x, index) => (
            <mesh key={`filter-slot-${index}`} position={[x + 0.08, 0.12, -0.248]}>
              <boxGeometry args={[0.035, 0.62, 0.012]} />
              <meshStandardMaterial color="#111716" roughness={0.7} />
            </mesh>
          ))}
          <mesh position={[-0.16, -0.72, 0.18]}>
            <cylinderGeometry args={[0.052, 0.052, 1.52, 14]} />
            <meshStandardMaterial color="#16201e" roughness={0.42} />
          </mesh>
          <mesh position={[-0.16, -1.5, 0.18]}>
            <boxGeometry args={[0.22, 0.16, 0.18]} />
            <meshStandardMaterial color="#1d2a27" roughness={0.65} />
          </mesh>
          <mesh position={[-0.16, -1.5, 0.275]}>
            <boxGeometry args={[0.2, 0.11, 0.025]} />
            <meshStandardMaterial color="#6a7773" roughness={0.85} />
          </mesh>
          <mesh position={[-0.25, -0.12, 0.19]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.038, 0.038, 0.48, 14]} />
            <meshStandardMaterial color="#22302c" roughness={0.45} />
          </mesh>
          <mesh position={[-0.42, -0.38, 0.19]} rotation={[0, 0, 0]}>
            <torusGeometry args={[0.09, 0.018, 8, 24]} />
            <meshStandardMaterial color="#101615" roughness={0.4} />
          </mesh>
          <mesh position={[-0.32, -0.15, 0.34]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.48, 0.72]} />
            <meshBasicMaterial color="#dffcff" transparent opacity={0.38} depthWrite={false} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[-0.32, -0.35, 0.42]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.34, 0.18]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.24} depthWrite={false} side={THREE.DoubleSide} />
          </mesh>
        </group>
      )}

      {hasHeater && (
        <group position={[-length / 2 + 0.38, -0.1, -width / 2 + 0.18]} rotation={[0, 0, 0.08]}>
          <mesh>
            <cylinderGeometry args={[0.07, 0.07, height * 0.72, 20]} />
            <meshPhysicalMaterial color="#d9f3ff" transparent opacity={0.42} roughness={0.08} transmission={0.35} thickness={0.16} depthWrite={false} />
          </mesh>
          {[-0.22, -0.08, 0.06, 0.2].map((y, index) => (
            <mesh key={`heater-coil-${index}`} position={[0, y * height, 0.005]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.043, 0.009, 8, 24]} />
              <meshStandardMaterial color="#ff7b3d" emissive="#ff5a21" emissiveIntensity={0.38} roughness={0.25} />
            </mesh>
          ))}
          <mesh position={[0, -height * 0.33, 0]}>
            <cylinderGeometry args={[0.068, 0.068, 0.11, 18]} />
            <meshStandardMaterial color="#202426" roughness={0.38} />
          </mesh>
          <mesh position={[0, height * 0.39, 0]}>
            <sphereGeometry args={[0.075, 14, 8]} />
            <meshStandardMaterial color="#191d1f" roughness={0.35} />
          </mesh>
          {[-0.42, 0.42].map((y, index) => (
            <mesh key={`heater-cup-${index}`} position={[0.105, y * height * 0.5, -0.02]} rotation={[0, Math.PI / 2, 0]}>
              <cylinderGeometry args={[0.105, 0.105, 0.022, 18]} />
              <meshStandardMaterial color="#101515" transparent opacity={0.72} roughness={0.5} />
            </mesh>
          ))}
        </group>
      )}

      {hasOxygen && (
        <group position={[-length / 3, -height / 2 + 0.34, width / 2 - 0.44]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.095, 0.095, 0.72, 18]} />
            <meshStandardMaterial color="#5e6d70" roughness={0.95} />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
            <cylinderGeometry args={[0.066, 0.066, 0.75, 18]} />
            <meshStandardMaterial color="#9aa8aa" roughness={0.92} />
          </mesh>
          <mesh position={[0.08, 0.08, 0]} rotation={[0, 0, Math.PI / 2]}>
            <torusGeometry args={[0.18, 0.012, 8, 28]} />
            <meshStandardMaterial color="#30393d" roughness={0.5} />
          </mesh>
          <mesh position={[-0.28, 0.25, -0.02]} rotation={[0.75, 0, 0.62]}>
            <torusGeometry args={[0.45, 0.012, 8, 42]} />
            <meshStandardMaterial color="#1b2426" roughness={0.42} />
          </mesh>
        </group>
      )}
    </group>
  );
}

function RockCluster({ length, width, height, isSaltwater }: { length: number; width: number; height: number; isSaltwater: boolean }) {
  const rocks = useMemo(() => {
    const count = isSaltwater ? 9 : 5;
    return Array.from({ length: count }, (_, index) => {
      const x = (seededRandom(`rock-x-${index}`) - 0.5) * (length * 0.64);
      const z = (seededRandom(`rock-z-${index}`) - 0.5) * (width * 0.55);
      const s = 0.22 + seededRandom(`rock-s-${index}`) * 0.28;
      return { x, z, s };
    });
  }, [isSaltwater, length, width]);

  return (
    <group>
      {rocks.map((rock, index) => (
        <mesh key={index} position={[rock.x, -height / 2 + 0.33 + rock.s * 0.25, rock.z]} scale={[rock.s * 1.4, rock.s, rock.s]}>
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color={isSaltwater ? '#dfd3ba' : '#5b5146'} roughness={0.88} />
        </mesh>
      ))}
      {isSaltwater && rocks.slice(0, 5).map((rock, index) => (
        <mesh key={`coral-${index}`} position={[rock.x + 0.12, -height / 2 + 0.66 + rock.s * 0.35, rock.z - 0.04]} rotation={[0, 0, index * 0.4]}>
          <coneGeometry args={[0.07, 0.38, 6]} />
          <meshStandardMaterial color={index % 2 ? '#ff9f7a' : '#d589e8'} roughness={0.62} />
        </mesh>
      ))}
    </group>
  );
}

function HardscapeSprite({ item, height }: { item: HardscapeRenderItem; height: number }) {
  const texture = useManagedTexture(getSpeciesDisplayImage(item.itemInfo));
  const aspect = texture.image ? texture.image.width / Math.max(texture.image.height, 1) : 1;
  const name = item.itemInfo.name;
  const spriteHeight = /砂|泥|底床/.test(name) ? 0.42 : /沉木|景观树/.test(name) ? 0.95 : 0.72;
  const spriteWidth = clamp(spriteHeight * aspect, 0.5, 1.65);

  return (
    <Billboard
      position={[item.x, -height / 2 + spriteHeight / 2 + 0.16, item.z]}
      follow
      lockX={false}
      lockY={false}
      lockZ={false}
    >
      <mesh rotation={[0, item.rotation, 0]} scale={[spriteWidth, spriteHeight, 1]} renderOrder={4}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          map={texture}
          transparent
          alphaTest={0.05}
          side={THREE.DoubleSide}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </Billboard>
  );
}

function HardscapeDisplay({ hardscape, length, width, height }: { hardscape?: string[]; length: number; width: number; height: number }) {
  const items = useMemo(() => {
    if (!hardscape || hardscape.length === 0) return [];
    return hardscape
      .map((value, index) => {
        const itemInfo = getAquariumHardscapeSpecies(value, fishData);
        if (!itemInfo) return null;
        const seed = `${value}-${index}-${hardscape.join(',')}`;
        return {
          itemInfo,
          x: (seededRandom(`hardscape-x-${seed}`) - 0.5) * (length * 0.58),
          z: (seededRandom(`hardscape-z-${seed}`) - 0.5) * (width * 0.44),
          rotation: (seededRandom(`hardscape-r-${seed}`) - 0.5) * 0.35,
        };
      })
      .filter(Boolean) as HardscapeRenderItem[];
  }, [hardscape, length, width]);

  if (items.length === 0) return null;

  return (
    <group>
      {items.map((item, index) => (
        <HardscapeSprite key={`${item.itemInfo.id}-${index}`} item={item} height={height} />
      ))}
    </group>
  );
}

function Bubbles({ length, width, height, count = 20, sourceX = 0, sourceZ = 0 }: { length: number; width: number; height: number; count?: number; sourceX?: number; sourceZ?: number }) {
  const group = useRef<THREE.Group>(null);
  const bubbles = useMemo(() => {
    return Array.from({ length: count }, (_, index) => ({
      x: sourceX + (seededRandom(`bubble-x-${index}-${count}-${sourceX}`) - 0.5) * (length - 0.6) * 0.36,
      z: sourceZ + (seededRandom(`bubble-z-${index}-${count}-${sourceZ}`) - 0.5) * (width - 0.5) * 0.36,
      size: 0.025 + seededRandom(`bubble-s-${index}`) * 0.05,
      speed: 0.18 + seededRandom(`bubble-speed-${index}`) * 0.28,
      offset: seededRandom(`bubble-o-${index}`) * 10,
    }));
  }, [length, width, count, sourceX, sourceZ]);

  useFrame((state) => {
    if (!group.current) return;
    group.current.children.forEach((child, index) => {
      const bubble = bubbles[index];
      child.position.y = -height / 2 + ((state.clock.elapsedTime * bubble.speed + bubble.offset) % height);
      child.position.x = bubble.x + Math.sin(state.clock.elapsedTime * 0.8 + bubble.offset) * 0.06;
    });
  });

  return (
    <group ref={group}>
      {bubbles.map((bubble, index) => (
        <mesh key={index} position={[bubble.x, -height / 2, bubble.z]} scale={[bubble.size, bubble.size, bubble.size]}>
          <sphereGeometry args={[1, 10, 8]} />
          <meshStandardMaterial color="#ffffff" transparent opacity={0.38} roughness={0.05} />
        </mesh>
      ))}
    </group>
  );
}

function SwimmingFish({
  fishInfo,
  speed,
  offset,
  lane,
  yLimit,
  boxWidth,
  boxLength,
  isActive,
  quantity,
  onClick,
}: {
  fishInfo: Fish;
  speed: number;
  offset: number;
  lane: number;
  yLimit: number;
  boxWidth: number;
  boxLength: number;
  isActive: boolean;
  quantity: number;
  onClick: (ref: React.RefObject<THREE.Group>) => void;
}) {
  const group = useRef<THREE.Group>(null);
  const fishVisualRef = useRef<THREE.Group>(null);
  const fishMeshRef = useRef<THREE.Mesh>(null);
  const shadowRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  const texture = useManagedTexture(getSpeciesDisplayImage(fishInfo));

  const isBottomDweller =
    fishInfo.category === '龟类' ||
    fishInfo.category === '虾类' ||
    fishInfo.category === '螺类' ||
    fishInfo.name.includes('清道夫') ||
    fishInfo.name.includes('鼠鱼') ||
    fishInfo.name.includes('异型');

  const baseSize = fishInfo.size === 'Large' ? 1.42 : fishInfo.size === 'Medium' ? 1.05 : 0.78;
  const aspect =
    fishInfo.name.includes('神仙') || fishInfo.name.includes('七彩') ? 1.08 :
    fishInfo.category === '龟类' ? 1.18 :
    fishInfo.category === '虾类' || fishInfo.category === '螺类' ? 1.1 :
    1.65;
  const bodyHeight = baseSize;
  const bodyLength = baseSize * aspect;
  const startX = useMemo(() => (seededRandom(`${fishInfo.id}-${offset}-x`) - 0.5) * boxWidth * 0.42, [boxWidth, fishInfo.id, offset]);
  const startZ = useMemo(() => (seededRandom(`${fishInfo.id}-${offset}-z`) - 0.5) * boxLength * 0.48, [boxLength, fishInfo.id, offset]);

  useFrame((state) => {
    if (!group.current) return;

    const time = state.clock.getElapsedTime();
    const swimX = Math.max(0.35, boxWidth / 2 - bodyLength * 0.85);
    const swimZ = Math.max(0.25, boxLength / 2 - bodyHeight * 0.8);
    const phase = time * speed + offset;
    const xPos = startX + Math.sin(phase) * swimX;
    const zPos = startZ + Math.cos(phase * 0.72 + lane) * swimZ;

    let yPos = -yLimit / 2 + 0.75 + (lane % 4) * (yLimit / 5);
    if (isBottomDweller) {
      yPos = -yLimit / 2 + 0.34 + Math.abs(Math.sin(phase * 0.9)) * 0.18;
    } else {
      yPos += Math.sin(phase * 0.45) * 0.28;
      yPos = clamp(yPos, -yLimit / 2 + 0.48, yLimit / 2 - 0.55);
    }

    group.current.position.set(xPos, yPos, zPos);

    if (fishVisualRef.current) {
      const direction = Math.cos(phase) >= 0 ? -1 : 1;
      fishVisualRef.current.scale.x = direction;
    }

    if (shadowRef.current) {
      const heightRatio = clamp((yPos + yLimit / 2) / yLimit, 0, 1);
      shadowRef.current.position.y = -yLimit / 2 - yPos + 0.18;
      shadowRef.current.scale.setScalar(0.95 + heightRatio * 0.65);
      const material = shadowRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = 0.19 - heightRatio * 0.12;
    }

    if (ringRef.current) {
      ringRef.current.rotation.z = time * 0.8;
    }
  });

  const handleInternalClick = (event: any) => {
    event.stopPropagation();
    onClick(group);
  };

  return (
    <group ref={group}>
      <Billboard follow lockX={false} lockY={false} lockZ={false}>
        <group ref={fishVisualRef}>
          <mesh ref={fishMeshRef} onClick={handleInternalClick} position={[0, 0, 0.06]} renderOrder={30}>
            <planeGeometry args={[bodyLength, bodyHeight]} />
            <meshBasicMaterial
              map={texture}
              transparent
              opacity={1}
              side={THREE.DoubleSide}
              depthWrite={false}
              depthTest={false}
              alphaTest={0.03}
              toneMapped={false}
            />
          </mesh>
        </group>
        {isActive && (
          <mesh ref={ringRef} position={[0, 0, -0.03]} scale={[bodyLength * 0.58, bodyHeight * 0.58, 1]}>
            <torusGeometry args={[1, 0.015, 8, 36]} />
            <meshBasicMaterial color="#f6c453" transparent opacity={0.78} />
          </mesh>
        )}
      </Billboard>

      <mesh ref={shadowRef} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[bodyLength * 0.72, bodyHeight * 0.28]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.15} depthWrite={false} />
      </mesh>

      {isActive && (
        <Html distanceFactor={8} zIndexRange={[100, 0]}>
          <div className="pointer-events-none -translate-y-10 rounded-full border border-white/70 bg-white/90 px-2.5 py-1 text-[10px] font-bold text-ink shadow-sm backdrop-blur-md">
            {fishInfo.name} x{quantity}
          </div>
        </Html>
      )}
    </group>
  );
}

function SceneLights({ isSaltwater }: { isSaltwater: boolean }) {
  return (
    <>
      <ambientLight intensity={0.72} />
      <directionalLight position={[2, 6, 3]} intensity={isSaltwater ? 2.1 : 1.7} color={isSaltwater ? '#d7f6ff' : '#fff8e6'} castShadow />
      <pointLight position={[-3, 2.5, 2.5]} intensity={0.8} color={isSaltwater ? '#88d7ff' : '#7ed6c8'} />
      <spotLight position={[0, 6, -3]} angle={0.42} penumbra={0.75} intensity={0.9} color="#ffffff" />
    </>
  );
}

function Backdrop({ length, width, height, isSaltwater }: { length: number; width: number; height: number; isSaltwater: boolean }) {
  return (
    <group>
      <mesh position={[0, 0, -width / 2 - 0.12]}>
        <planeGeometry args={[length * 1.06, height * 1.05]} />
        <meshBasicMaterial color={isSaltwater ? '#e9fbff' : '#effaf5'} />
      </mesh>
      <mesh position={[0, -height / 2 + 0.45, -width / 2 - 0.1]}>
        <planeGeometry args={[length * 0.8, height * 0.32]} />
        <meshBasicMaterial color={isSaltwater ? '#bbeeff' : '#cfeee2'} transparent opacity={0.5} />
      </mesh>
    </group>
  );
}

export function ThreeAquarium({ aquarium, activeSpecies, onSpeciesSelect }: ThreeAquariumProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const length = parseDimension(aquarium.dimensions?.length, 6);
  const width = parseDimension(aquarium.dimensions?.width, 4);
  const height = parseDimension(aquarium.dimensions?.height, 4);
  const isSaltwater = aquarium.waterType === 'Saltwater';
  const equipment = aquarium.equipment || { filter: '瀑布过滤', heater: true, oxygen: false, light: isSaltwater ? '海水灯' : '普通灯' };
  const [targetPos, setTargetPos] = useState<THREE.Vector3 | null>(null);
  const documentVisible = useDocumentVisible();
  const isInView = useElementInView(containerRef);
  const isMobileViewport = useIsMobileViewport();
  const canRender = documentVisible && isInView;
  const renderFps = isMobileViewport ? 24 : 30;
  const maxPixelRatio = isMobileViewport ? 1.25 : 1.5;

  const allSwimFishes = useMemo<SwimItem[]>(() => {
    const items: SwimItem[] = [];
    aquarium.fishes.forEach((aqFish, aqIndex) => {
      const fishInfo = fishData.find((fish) => fish.id === aqFish.fishId);
      if (!fishInfo) return;

      for (let index = 0; index < (aqFish.quantity || 1); index += 1) {
        const seed = `${aqFish.id}-${fishInfo.id}-${index}`;
        items.push({
          id: `${aqFish.id}-${index}`,
          fishInfo,
          isLeader: index === 0,
          quantity: aqFish.quantity || 1,
          speed: 0.16 + seededRandom(`${seed}-speed`) * 0.22,
          offset: seededRandom(`${seed}-offset`) * Math.PI * 2,
          lane: aqIndex + index,
        });
      }
    });
    return items.slice(0, 42);
  }, [aquarium.fishes]);

  const handleActiveFishChange = (fishObjRef: React.RefObject<THREE.Group>, fishId: string) => {
    onSpeciesSelect?.(fishId);
    if (!fishObjRef.current) return;

    const pos = new THREE.Vector3();
    fishObjRef.current.getWorldPosition(pos);
    setTargetPos(pos);
  };

  useEffect(() => {
    if (!activeSpecies) setTargetPos(null);
  }, [activeSpecies]);

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden bg-[#eef7f5]" style={{ touchAction: 'none' }}>
      <Canvas
        shadows
        frameloop="demand"
        dpr={[1, maxPixelRatio]}
        camera={{ position: [length * 0.78, height * 0.42, width * 1.45], fov: 42 }}
        gl={{ antialias: true, alpha: true }}
        onPointerMissed={() => onSpeciesSelect?.(null)}
      >
        <CappedRenderLoop active={canRender} fps={renderFps} />
        <RendererLifecycle />
        <fog attach="fog" args={[isSaltwater ? '#dff8ff' : '#e9f6f1', 7, 18]} />
        <color attach="background" args={[isSaltwater ? '#eefcff' : '#f4fbf8']} />

        <SceneLights isSaltwater={isSaltwater} />
        <CameraRig targetPosition={targetPos} />

        <OrbitControls
          enablePan={false}
          minDistance={Math.max(2.5, width * 0.75)}
          maxDistance={length * 3.2}
          maxPolarAngle={1.42}
          minPolarAngle={0.45}
          zoomSpeed={1.1}
          rotateSpeed={0.55}
        />

        <Backdrop length={length} width={width} height={height} isSaltwater={isSaltwater} />
        <TankFrame length={length} width={width} height={height} isSaltwater={isSaltwater} />
        <WaterVolume length={length} width={width} height={height} isSaltwater={isSaltwater} />
        <SubstrateBed length={length} width={width} height={height} substrate={aquarium.substrate || (isSaltwater ? '珊瑚砂' : '河沙')} />
        {(!aquarium.hardscape || aquarium.hardscape.length === 0) && (
          <RockCluster length={length} width={width} height={height} isSaltwater={isSaltwater} />
        )}
        <HardscapeDisplay hardscape={aquarium.hardscape} length={length} width={width} height={height} />
        <PlantGarden plants={aquarium.plants} length={length} width={width} height={height} />
        <EquipmentSystem length={length} width={width} height={height} equipment={equipment} isSaltwater={isSaltwater} />
        <Bubbles
          length={length}
          width={width}
          height={height}
          count={(equipment.oxygen ? 42 : 14) + (equipment.filter && equipment.filter !== '无' ? 8 : 0)}
          sourceX={equipment.oxygen ? -length / 3 : length / 3}
          sourceZ={equipment.oxygen ? width / 2 - 0.44 : -width / 2 + 0.2}
        />

        {allSwimFishes.map((item) => (
          <SwimmingFish
            key={item.id}
            fishInfo={item.fishInfo}
            speed={item.speed}
            offset={item.offset}
            lane={item.lane}
            yLimit={height}
            boxWidth={length}
            boxLength={width}
            isActive={activeSpecies === item.fishInfo.id && item.isLeader}
            quantity={item.quantity}
            onClick={(ref) => handleActiveFishChange(ref, item.fishInfo.id)}
          />
        ))}
      </Canvas>

      <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-white/45 to-transparent" />
      {allSwimFishes.length === 0 && (
        <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-white/70 bg-white/85 px-3 py-1.5 text-[11px] font-bold text-ink/55 shadow-sm backdrop-blur-md">
          添加生物后，它们会在这个 3D 鱼缸里游动
        </div>
      )}
      <div className="pointer-events-none absolute inset-x-4 bottom-3 hidden justify-between text-[10px] font-bold text-ink/35 md:flex">
        <span>{isSaltwater ? '海水礁岩视图' : '淡水造景视图'}</span>
        <span>{allSwimFishes.length > 0 ? `已显示 ${allSwimFishes.length} 个活体` : '空缸预览'}</span>
      </div>
    </div>
  );
}
