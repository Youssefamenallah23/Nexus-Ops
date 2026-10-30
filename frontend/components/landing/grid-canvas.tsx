"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

/**
 * The hub core: a wireframe icosahedron with two orbital rings of glowing
 * document-nodes, additive-blended, with fog depth. Slow, heavy, premium.
 */
const VOLTAGE = new THREE.Color("#0297de");
const FAULT = new THREE.Color("#fc734d");

function Core() {
  const mesh = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (!mesh.current) return;
    const t = state.clock.elapsedTime;
    mesh.current.rotation.y = t * 0.12;
    mesh.current.rotation.x = Math.sin(t * 0.1) * 0.2;
  });
  return (
    <mesh ref={mesh}>
      <icosahedronGeometry args={[2.2, 1]} />
      <meshBasicMaterial color={VOLTAGE} wireframe transparent opacity={0.16} />
    </mesh>
  );
}

function InnerCore() {
  const mesh = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (!mesh.current) return;
    const s = 1 + Math.sin(state.clock.elapsedTime * 0.8) * 0.06;
    mesh.current.scale.setScalar(s);
  });
  return (
    <mesh ref={mesh}>
      <icosahedronGeometry args={[0.9, 0]} />
      <meshBasicMaterial color={VOLTAGE} wireframe transparent opacity={0.5} />
    </mesh>
  );
}

function OrbitRing({ radius, tilt, speed, count, color }: {
  radius: number; tilt: number; speed: number; count: number; color: THREE.Color;
}) {
  const group = useRef<THREE.Group>(null);
  const dots = useMemo(
    () => Array.from({ length: count }, (_, i) => (i / count) * Math.PI * 2),
    [count]
  );
  useFrame((state) => {
    if (group.current) group.current.rotation.z = state.clock.elapsedTime * speed;
  });
  return (
    <group rotation={[tilt, 0, 0]}>
      <group ref={group}>
        {dots.map((a, i) => (
          <mesh key={i} position={[Math.cos(a) * radius, Math.sin(a) * radius, 0]}>
            <sphereGeometry args={[i % 6 === 0 ? 0.09 : 0.05, 10, 10]} />
            <meshBasicMaterial color={i % 6 === 0 ? FAULT : color} transparent opacity={0.95} />
          </mesh>
        ))}
      </group>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[radius, 0.008, 8, 90]} />
        <meshBasicMaterial color={color} transparent opacity={0.22} />
      </mesh>
    </group>
  );
}

function ParticleField() {
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const n = 350;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 30;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 18;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 20 - 4;
    }
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return g;
  }, []);
  const pts = useRef<THREE.Points>(null);
  useFrame((state) => {
    if (pts.current) pts.current.rotation.y = state.clock.elapsedTime * 0.015;
  });
  return (
    <points ref={pts} geometry={geo}>
      <pointsMaterial color={VOLTAGE} size={0.045} transparent opacity={0.55}
        blending={THREE.AdditiveBlending} depthWrite={false} />
    </points>
  );
}

function Scene() {
  const group = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (!group.current) return;
    group.current.rotation.y += (state.pointer.x * 0.25 - group.current.rotation.y) * 0.04;
    group.current.rotation.x += (state.pointer.y * 0.15 - group.current.rotation.x) * 0.04;
  });
  return (
    <group ref={group}>
      <Core />
      <InnerCore />
      <OrbitRing radius={3.4} tilt={1.15} speed={0.25} count={10} color={VOLTAGE} />
      <OrbitRing radius={4.4} tilt={2.0} speed={-0.16} count={14} color={VOLTAGE} />
      <OrbitRing radius={5.2} tilt={0.5} speed={0.1} count={7} color={FAULT} />
      <ParticleField />
    </group>
  );
}

export function HubCanvas() {
  return (
    <Canvas
      camera={{ position: [0, 1.5, 11], fov: 45 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
    >
      <fog attach="fog" args={["#02070a", 9, 24]} />
      <Scene />
    </Canvas>
  );
}
