"use client";

import { Canvas } from "@react-three/fiber";
import { Environment, Lightformer, OrbitControls } from "@react-three/drei";
import { Component, useEffect, useRef, useState, type ComponentRef, type KeyboardEvent, type ReactNode } from "react";
import { useReducedMotionPreference } from "@/hooks/use-reduced-motion";

const CAMERA = { position: [0, 0, 8.5] as [number, number, number], fov: 36 };
type SceneColors = { metal: string; core: string; edge: string; light: string };

function Core({ colors }: { colors: SceneColors }) {
  return (
    <group rotation={[0.24, 0.3, -0.25]}>
      {[0, 1, 2].map((index) => (
        <mesh key={index} rotation={[index * Math.PI / 3, index * 0.65, index * 0.2]}>
          <torusGeometry args={[1.72 + index * 0.19, 0.12 - index * 0.018, 16, 64]} />
          <meshStandardMaterial color={colors.metal} metalness={1} roughness={0.22} />
        </mesh>
      ))}
      <mesh rotation={[0.3, 0.7, 0.1]}>
        <icosahedronGeometry args={[0.78, 0]} />
        <meshStandardMaterial color={colors.core} metalness={0.83} roughness={0.16} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2.24, 0.012, 6, 64]} />
        <meshBasicMaterial color={colors.edge} />
      </mesh>
    </group>
  );
}

class CanvasBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed ? <p className="core-unavailable">3D preview unavailable on this device.</p> : this.props.children;
  }
}

export function HubCanvas({ paused = true }: { paused?: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const [active, setActive] = useState(false);
  const reduced = useReducedMotionPreference();
  const [colors, setColors] = useState<SceneColors | null>(null);

  useEffect(() => {
    let intersecting = false;
    const syncVisibility = () => setActive(intersecting && !document.hidden);
    const observer = new IntersectionObserver(([entry]) => {
      intersecting = entry.isIntersecting;
      syncVisibility();
    });
    if (host.current) observer.observe(host.current);
    document.addEventListener("visibilitychange", syncVisibility);

    const frame = requestAnimationFrame(() => {
      const styles = getComputedStyle(document.documentElement);
      const token = (name: string) => styles.getPropertyValue(name).trim();
      setColors({ metal: token("--metal-light"), core: token("--metal-core"), edge: token("--metal-edge"), light: token("--foreground") });
    });
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener("visibilitychange", syncVisibility);
    };
  }, []);

  function rotateWithKeyboard(event: KeyboardEvent<HTMLDivElement>) {
    const orbit = controls.current;
    if (!orbit) return;
    const step = Math.PI / 12;
    switch (event.key) {
      case "ArrowLeft": orbit.setAzimuthalAngle(orbit.getAzimuthalAngle() - step); break;
      case "ArrowRight": orbit.setAzimuthalAngle(orbit.getAzimuthalAngle() + step); break;
      case "ArrowUp": orbit.setPolarAngle(Math.max(0.3, orbit.getPolarAngle() - step)); break;
      case "ArrowDown": orbit.setPolarAngle(Math.min(Math.PI - 0.3, orbit.getPolarAngle() + step)); break;
      case "Home": orbit.reset(); break;
      default: return;
    }
    event.preventDefault();
  }

  const autoRotate = !paused && !reduced && active;
  return (
    <div ref={host} className="core-canvas" role="group" tabIndex={0} onKeyDown={rotateWithKeyboard}
      aria-label="Interactive titanium core. Drag to rotate, or use arrow keys. Press Home to reset. Scrolling does not zoom.">
      <div className="core-fallback" aria-hidden="true"><span /><span /><span /></div>
      {colors && (
        <CanvasBoundary>
          <Canvas frameloop={!active ? "never" : autoRotate ? "always" : "demand"} camera={CAMERA} dpr={[1, 1.25]}
            gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
            onCreated={({ gl }) => gl.setClearAlpha(0)} fallback={<p className="core-unavailable">3D preview unavailable on this device.</p>}>
            <ambientLight intensity={0.4} />
            <directionalLight position={[3, 5, 4]} intensity={3} color={colors.light} />
            <Environment resolution={64} frames={1}>
              <Lightformer intensity={5} position={[0, 5, -2]} scale={[8, 3, 1]} color={colors.light} />
              <Lightformer intensity={3} position={[-4, 0, 2]} scale={[2, 8, 1]} color={colors.metal} />
              <Lightformer intensity={4} position={[4, -2, 1]} scale={[2, 5, 1]} color={colors.edge} />
            </Environment>
            <Core colors={colors} />
            <OrbitControls ref={controls} makeDefault enabled={active} enableZoom={false} enablePan={false}
              enableDamping={!reduced} dampingFactor={0.1} rotateSpeed={0.6} autoRotate={autoRotate} autoRotateSpeed={0.5}
              minPolarAngle={0.3} maxPolarAngle={Math.PI - 0.3} />
          </Canvas>
        </CanvasBoundary>
      )}
    </div>
  );
}
