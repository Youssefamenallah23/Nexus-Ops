# Nexus Ops frontend

Next.js App Router workspace for uploading and reviewing operational documents, following tasks and webhook delivery, and asking the copilot about approved sources.

See the [root README](../README.md) for the product idea, backend setup, seeded accounts, and a complete demo walkthrough.

## Develop

```powershell
npm ci
npm run dev
```

Open [localhost:3000](http://localhost:3000). The backend must run on port 8000 for sign-in and workspace data. The landing simulation is local and works without the API.

The API helper in `lib/api.ts` uses the browser hostname on port 8000 by default. For another API origin, set `NEXT_PUBLIC_API_URL` in `.env.local` and restart Next.js. Keep frontend/API cookie and CORS configuration aligned.

## Main files

- `app/page.tsx`: landing page.
- `components/landing/grid-canvas.tsx`: interactive Three.js scene, demand rendering, fixed camera distance.
- `components/landing/landing-motion.tsx`: GSAP text animation.
- `components/landing/interactive-pipeline-demo.tsx`: local sample simulation and approval/rejection gate.
- `app/(dashboard)/app/documents`: real upload and review workflow.
- `app/(dashboard)/app/copilot`: retrieval questions and cited answers.
- `components/dashboard-shell.tsx`: session gate, navigation, and shared shell.
- `app/tokens.css` and `app/premium.css`: shared visual system.

The 3D scene is idle by default. Drag to rotate; arrow keys work when focused; Home resets. Auto-rotation is optional. Scroll and pinch do not change camera distance. Rendering stops off-screen and reduced-motion preferences are respected.

## Check

```powershell
npm run lint -- --quiet
npm run build
```

Browser checks need the running development server and Chrome. Set `CHROME_PATH` to override the default Windows executable location.

```powershell
node scripts/ui-smoke.mjs
node scripts/login-smoke.mjs
node scripts/workflow-smoke.mjs
node scripts/scene-smoke.mjs
```

Avoid running `next start` beside `next dev` for the same workspace. A production server serves the last build, which may reference stale assets after further edits.
