"use client";

import { useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export function LandingMotion() {
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.from("[data-hero-enter]", {
        y: 28, opacity: 0, duration: 1.1, stagger: 0.13,
        ease: "power3.out", clearProps: "all",
      });
      gsap.from(".capability-row", {
        y: 18, stagger: 0.08, duration: 0.6, clearProps: "all",
        scrollTrigger: { trigger: ".capability-list", start: "top 80%", once: true },
      });
    });
    return () => media.revert();
  }, []);
  return null;
}
