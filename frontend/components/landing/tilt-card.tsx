"use client";

import React from "react";

interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
  maxTilt?: number;
  id?: string;
}

// Retain the existing component contract; stable surfaces keep working data legible.
export function TiltCard({ children, className = "", id }: TiltCardProps) {
  return <div id={id} className={`surface-panel relative ${className}`}>{children}</div>;
}
