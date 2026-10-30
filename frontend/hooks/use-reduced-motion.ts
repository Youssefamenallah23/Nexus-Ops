"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";
function subscribe(update: () => void) {
  const media = window.matchMedia(QUERY);
  media.addEventListener("change", update);
  return () => media.removeEventListener("change", update);
}
const snapshot = () => window.matchMedia(QUERY).matches;
const serverSnapshot = () => true;

export function useReducedMotionPreference() {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}
