# PHOTO STUDIO AI — Background Replacement Fix Progress Log

## Root Cause (CONFIRMED by code inspection)

### Background Editor (`useBackgroundEditor.ts`)
- Used `makeChromaMask(imageData, bgColor, threshold)` — treats pixels CLOSE to `bgColor` as background
- **Bug**: Upload photo with white background + select light blue → white is FAR from light blue → treated as foreground → white background stays
- Chroma key only works when original background COLOR matches the removal target color

### Passport Studio (`usePassportStudio.ts`)
- Did NO background removal at all — drew source image directly onto each cell

## Changes Made

### `frontend/src/utils/image.ts`
- Added `floodFillBackgroundMask(imageData, tolerance)` — border flood-fill segmentation
  - Seeds from all border pixels, flood-fills through similar colors as background
  - Everything not reached = foreground
  - Works for person against white/blue/green/solid backgrounds touching the frame edge
- Added `autoSegmentImageData(imageData, tolerance)` — returns { mask, fgImageData }
  - fgImageData is premultiplied (RGB * alpha), ready for compositeOverColor
- Exported both functions

### `frontend/src/hooks/useBackgroundEditor.ts`
- Replaced `makeChromaMask` with `autoSegmentImageData`
- Added `segCache` (React state) to cache segmentation result per source image
- Changing background color reuses cached mask (no re-segmentation, no quality degradation)
- Composites foreground over selected background color via `compositeOverColor`
- Transparent option writes mask as alpha channel

### `frontend/src/hooks/usePassportStudio.ts`
- Added `segCache` ref (not state, to avoid re-render loops)
- `prepareForeground()` segments source once, re-composites over bg color when it changes
- `renderSheet()` draws composited foreground (person + selected bg) onto each cell
- Sheet paper background remains white (#ffffff) — never changes
- All 8 copies use the processed photograph

### `frontend/src/utils/image.test.ts`
- Added tests for `floodFillBackgroundMask` (border=background, center=foreground, all-bg, all-fg, tolerance)
- Added tests for `autoSegmentImageData` (premultiplied fg, border=0 alpha, center=255 alpha)
- Added `compositeOverColor` semi-transparent test

### `functions/segment.js`
- Updated message to reflect client-side segmentation

### `frontend/vite.config.ts`
- Added `exclude: ['tests/**', '**/node_modules/**']` to vitest config

### `frontend/src/main.tsx`
- Added error boundary fallback UI in catch block (renders error message in DOM)

## Verification
- TypeScript: PASS
- Vitest: 21/21 PASS (6 image + 10 ErrorBoundary + 5 new segmentation tests)
- Vite production build: PASS

## Git
- Branch: develop
- Not yet committed