# Nexus Ops design system

The product turns operational documents into reviewed, traceable workflows. The landing page leads with a titanium approval core; the workspace leads with operational data.

Use the tokens in frontend/app/tokens.css. Preserve the existing black, porcelain, blue and amber palette and Inter family. Blue indicates action or selection; amber indicates a review checkpoint. Never imply a live service state without data.

Landing content is capped at 1200px. Headlines use a compact, tightly spaced display scale. Application content is capped at 1600px, with 13px supporting copy, 15px section titles and 30px page headings. Tables remain tables. Stable panels use 20px corners; controls use smaller radii or pills where established.

GSAP owns the hero text entrance and capability stagger. The 3D canvas is never scaled or translated by scrolling. Its camera distance is fixed, rendering is on demand, drag and keyboard controls rotate the view, and automatic rotation is opt-in. Route transitions last 280ms. No animation should delay actions. Honor reduced motion, leave content visible without scripting, revert effects on unmount, and pause WebGL when off-screen or hidden. WebGL has a static ring fallback and a user pause control.

Keep all existing routes, authentication, role checks, upload/review handlers, simulation disclosures and API behavior. Real data and simulated results must remain distinguishable. Do not add customer claims, testimonials or performance metrics without evidence.

