# Brag Plan: NEXUS OPS

## Rubric (9 questions)

1. **What is it?** NEXUS OPS — an "Autonomous Operations Hub" (its own page title): AI ingests operational documents (maintenance reports, supplier quotes, purchase requests, meeting minutes), extracts the fields, and proposes work; a human approves; approved work is dispatched to n8n automations with signed webhooks.
2. **Who is it for?** Grid operators / facilities teams drowning in paperwork — admins (Claire Moreau), managers (Thomas Le Goff), field employees.
3. **What does the product look like?** Dark control-room UI: near-black ground, voltage-blue accents, fault-orange warnings, green approvals. Inter. Screens captured live at `assets/screens/`.
4. **Strongest claim?** Every consequential action goes through a human approval gate — "Approve and create task" — then "Cryptographically signed webhook emissions dispatched to external n8n automation clusters."
5. **Proof?** Live screens: document review (AI extraction at 90% confidence, source text side-by-side, "Original file" download), approval → `task_id baa2000e…`, "Document Approved & Dispatched — Success" in the workflow audit, Agent Observatory telemetry (supervisor / classification / document-intelligence / qa / knowledge / automation agents, "Zero unhandled agent exceptions").
6. **What's the demo-able wow?** Upload → classified `needs_review` by the live Mistral-on-NVIDIA agent → human clicks Approve once → task created and dispatched to n8n, every step traceable in the Observatory.
7. **What makes it different?** It doesn't fire automation on AI output. The LangGraph gate stops, waits for a person, then runs the automation — and shows the receipts.
8. **Tone / angle?** `polished` (serious product): "The machine reads. You decide. The work runs." Two-sentence angle below.
9. **What must NOT be claimed?** No invented business metrics. The "Hours Saved 150" card is the app's own simulation — kept off marketing copy. Numbers shown are system facts visible on the captured screens (invocations, exceptions, success statuses).

## Angle

A document lands. Six specialist agents read it, extract every field, and show the extraction next to the source text at 90% confidence. Then the pipeline stops. A human looks; one click of "Approve and create task"; an HMAC-signed webhook dispatches the work to n8n and the Agent Observatory records every agent call made on the way. NEXUS OPS = powerful agents, human control, receipts on screen.

## Format

- Landscape 1920×1080, 30fps
- Duration: 20.74 s (within 15–25)
- Output: `brag-output/composition/` → `brag-output/brag.mp4`

## Storyboard (all screens are real captures from the running app)

| # | Time | Beat | Visual | Overlay copy (grounded) | Cut on beat |
|---|------|------|--------|--------------------------|-------------|
| S0 | 0.00–2.46 | Hook | Wordmark reveal on black; blue scan-line | NEXUS OPS / "Autonomous Operations Hub" | 0.00, 2.46 |
| S1 | 2.46–6.82 | The machine reads | `09-document-detail.png` slow zoom; crop drifts over extracted fields + source panel | "AI extraction — 90% confidence." / "Every field, right next to its source." | 2.46 |
| S2 | 6.82–9.20 | The gate | 2.4× crop onto the live "Reject / Approve and create task" buttons; button glow on the click | "Then it stops. For you." | 6.82 |
| S2b | 9.20–11.47 | One click | Hard cut to `10-document-approved.png`; fields lock; green Approved badge | "Approved · Task created" | 9.20 (click SFX at 8.73) |
| S3 | 11.47–15.82 | Dispatch | `05-workflows.png` crop onto the top row: "Document Approved & Dispatched — Success" | "HMAC-signed webhook → n8n. Automatically." | 11.47 |
| S4a | 15.82–18.01 | The receipts | `04-observatory.png` pan across agent telemetry | "Every agent step on the record." / "0 unhandled exceptions" | 15.82 (strong cue) |
| S4b | 18.01–20.74 | Outro | End card: wordmark + punchline | "Approve once. Everything after is automatic." | 18.01 (strong cue), end 20.74 |

## Music

`happy-beats-business-moves-vol-10-by-ende-dot-app.mp3` (60 s, ~110 BPM), CC BY 4.0.
**Music cue guidance** (preset read from `assets/music/cues/…vol-10…md`): beat grid 0.27/2.46/6.82/9.29/11.47/15.82/18.01/20.74; all scene cuts land on grid beats; outro lands on the 18.01 strong cue; final hold rides beats 18.55–20.74. Duck nothing (no narration).

## SFX

- 8.73 s — approve click (`sfx_003.mp3`, crisp short click)
- 2.46 s + 11.47 s — scene-in whoosh/click (`sfx_001.mp3`)
Volumes low; music continues under.

## Avoid

- Generic SaaS language ("streamline your workflow")
- Abstract filler visuals — every frame after the hook is the real app
- Invented metrics (no "10×", no simulated business numbers as claims)
