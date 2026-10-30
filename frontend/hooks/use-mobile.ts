"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(max-width: 767px)";
function subscribe(update: () => void) {
  const media = window.matchMedia(QUERY);
  media.addEventListener("change", update);
  return () => media.removeEventListener("change", update);
}
const snapshot = () => window.matchMedia(QUERY).matches;
const serverSnapshot = () => false;

export function useIsMobile() {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}
