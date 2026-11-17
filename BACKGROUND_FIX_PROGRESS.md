# PHOTO STUDIO AI — Background Replacement Fix Progress Log

## Root Cause (CONFIRMED by code inspection)

### Background Editor (`useBackgroundEditor.ts`)
- Uses `floodFillBackgroundMask(imageData, bgColor, threshold)` — treats pixels **close to** `bgColor` as background
- **Bug**: Upload photo with white background + select light blue → white is FAR from light blue → treated as **foreground** → white background stays!
- Chroma key only works when original background COLOR matches the removal target color

### Passport Studio (`usePassportStudio.ts`)
- Does **no background removal at all** — draws source image directly onto each cell
- Original background stays in all 8 copies

## Phase 1: Infrastructure ✅ COMPLETED
- Installed `@mediapipe/tasks-vision` for browser-based segmentation
- Added `erodeMask`, `dilateMask`, `gaussianBlur`, `compositeForeground`, `compositeOver`, `drawMaskOverlay`, `brushStroke` to `image.ts`
- Added `floodFillBackgroundMask`, `autoSegmentImageData` (already existed)
- Added `segmentImage` with MediaPipe Workers AI + flood-fill fallback in `segmentation.ts`
- TypeScript: PASS
- Vitest: 21/21 PASS
- Vite build: PASS

## Phase 2: Background Editor Rewrite ✅ COMPLETED
- Rewrote `useBackgroundEditor.ts` — MediaPipe segmentation + manual brush editing
- Rewrote `BackendEditor.tsx` — upload → segment → replace → refine → preview → export
- Added mask editing brushes (keep/remove)
- Added before/after comparison toggle
- Added edge feather slider
- Added background color selection

## Phase 3: Passport Studio Rewrite (IN PROGRESS)
- Rewrite `usePassportStudio.ts` — same segmentation, master crop/position
- Rewrite `PassportStudio.tsx` — upload → segment → crop → background → preview → sheet → export
- All 8 copies sync from master; print paper stays white

## Phase 4: Enhancement Engine
- Add `enhanceImage` to `image.ts` (exposure, contrast, saturation, highlights, shadows, sharpness)
- Add Enhance button to Normal Photo Editor
- Add before/after comparison

## Phase 5: Testing & Build
- TypeScript check: PASS
- Vitest: 21/21 PASS
- Vite build: PASS
- Playwright browser tests (8 viewports): TODO
- Commit + push to develop: TODO

## Git Status
- Branch: `develop` at commit `ed2a2a4` (plus my changes not yet committed)
- Working tree: has uncommitted changes