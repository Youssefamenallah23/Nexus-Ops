"use client";

import React from "react";

export function Magnetic({ children, className }: { children: React.ReactNode; strength?: number; className?: string }) {
  return <div className={className}>{children}</div>;
}

export function MagneticGlowButton({ children, onClick, className = "" }: { children: React.ReactNode; onClick?: () => void; className?: string; strength?: number; glowColor?: string }) {
  return <button type="button" onClick={onClick} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full font-medium transition-colors ${className}`}>{children}</button>;
}

export const staggerContainer = { hidden: { opacity: 1 }, show: { opacity: 1 } };
export const staggerItem = { hidden: { opacity: 1 }, show: { opacity: 1 } };
export const scaleUpItem = staggerItem;
