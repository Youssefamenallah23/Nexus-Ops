"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";

/**
 * Premium 3D Page Transition:
 * Subtle scale and blur-to-crisp focus with cubic-bezier easing.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      if (!root.current || root.current.querySelector(".landing-page")) return;
      gsap.from(root.current, { opacity: 0, y: 8, duration: 0.28, ease: "power2.out", clearProps: "all" });
    });
    return () => media.revert();
  }, []);
  return (
    <div ref={root} className="w-full flex-1">
      {children}
    </div>
  );
}
