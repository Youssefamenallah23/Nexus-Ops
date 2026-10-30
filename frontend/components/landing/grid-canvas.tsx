"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

/**
 * The "operations grid" — a living network of document nodes flowing through the
 * platform. Voltage-blue with a few fault-orange outliers, gently breathing.
 */

const NODE_COUNT = 64;
const VOLTAGE = "#0297de";
const FAULT = "#fc734d";

function useNetwork() {
  return useMemo(() => {
    const nodes: THREE.Vector3[] = [];
    for (let i = 0; i < NODE_COUNT; i++) {
      const col = i % 8;
      const row = Math.floor(i / 8);
      nodes.push(
        new THREE.Vector3(
          (col - 3.5) * 2.4 + Math.sin(i * 12.9898) * 0.7,
          (row - 3.5) * 1.8 + Math.cos(i * 78.233) * 0.5,
          Math.sin(i * 43.1) * 1.6
        )
      );
    }
    const linePositions: number[] = [];
    const lineColors: number[] = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        if (nodes[i].distanceTo(nodes[j]) < 3.4) {
          linePositions.push(nodes[i].x, nodes[i].y, nodes[i].z, nodes[j].x, nodes[j].y, nodes[j].z);
          const hot = i % 9 === 0 || j % 9 === 0;
          const c = hot ? new THREE.Color(FAULT) : new THREE.Color(VOLTAGE);
          lineColors.push(c.r, c.g, c.b, c.r, c.g, c.b);
        }
      }
    }
    return { nodes, linePositions, lineColors };
  }, []);
}

function Network() {
  const group = useRef<THREE.Group>(null);
  const { nodes, linePositions, lineColors } = useNetwork();

  const lineGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(linePositions, 3));
    geo.setAttribute("color", new THREE.Float32BufferAttribute(lineColors, 3));
    return geo;
  }, [linePositions, lineColors]);

  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime;
    group.current.rotation.y = Math.sin(t * 0.08) * 0.35 + state.pointer.x * 0.15;
    group.current.rotation.x = Math.cos(t * 0.06) * 0.12 + state.pointer.y * 0.1;
    group.current.position.y = Math.sin(t * 0.5) * 0.15;
  });

  return (
    <group ref={group}>
      <lineSegments geometry={lineGeo}>
        <lineBasicMaterial vertexColors transparent opacity={0.28} />
      </lineSegments>
      {nodes.map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[(i % 9 === 0 ? 0.14 : 0.08) + (i % 5) * 0.01, 12, 12]} />
          <meshBasicMaterial color={i % 9 === 0 ? FAULT : VOLTAGE} transparent opacity={0.9} />
        </mesh>
      ))}
    </group>
  );
}

export function GridCanvas() {
  return (
    <Canvas camera={{ position: [0, 0, 14], fov: 50 }} dpr={[1, 1.5]} gl={{ antialias: true, alpha: true }}>
      <Network />
    </Canvas>
  );
}
