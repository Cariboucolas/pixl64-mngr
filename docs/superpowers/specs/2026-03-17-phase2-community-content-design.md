# Phase 2 — Community & Content

## Summary

Phase 2 adds three features to Pixl64 Mngr, delivered incrementally:

1. **Image Cropper** — Pan + zoom tool for framing images before sending to the Pixoo-64
2. **URL Import** — Load an image from a URL instead of a local file
3. **Community Gallery** — Browse and search Divoom community content (with local favorites fallback)

## 1. Image Cropper (Pan + Zoom)

### Problem

Currently, uploaded images are resized to 64x64 without user control over which part of the image is kept. Users need to frame the area they want.

### Solution

A new `ImageCropper.vue` component inserted between image loading and the 64x64 preview.

### Flow

```
Upload file / URL → Source image → ImageCropper (pan + zoom) → ImagePreview 64x64 live → Send
```

### Component: `ImageCropper.vue`

- Canvas displaying the source image fitted to available space (contain mode, centered)
- **Drag** (mousedown + mousemove) to pan
- **Wheel** to zoom in/out
- Square crop region enforced (1:1 ratio) — matches the 64x64 output
- Internal state: `offsetX`, `offsetY`, `scale`
- Emits an `ImageData` (64x64) on each change (debounced ~100ms) by extracting the visible area and downscaling
- The existing `ImagePreview.vue` displays the result in real time alongside

### Crop utility

New function in `src/services/divoom/image.ts` (not an extraction — this is new logic):

```ts
const extractCrop = (
  source: HTMLImageElement | HTMLCanvasElement,
  offsetX: number,
  offsetY: number,
  scale: number,
  size: number
): ImageData
```

- Draws the source image onto a temporary `size x size` canvas using the pan/zoom parameters
- The crop region is always **1:1 (square)** since the Pixoo-64 output is 64x64
- Returns the resulting `ImageData`

### Files

| File | Action |
|---|---|
| `src/components/image/ImageCropper.vue` | **New** — pan + zoom canvas component |
| `src/pages/SendImagePage.vue` | **Modified** — integrate cropper between upload and preview |
| `src/services/divoom/image.ts` | **Modified** — add `extractCrop` utility function |

### Acceptance criteria

- User can pan and zoom on a loaded image
- 64x64 preview updates in real time
- Sent image matches the preview exactly
- Works with both file upload and URL import

---

## 2. URL Import

### Problem

Users may want to load an image from a URL without downloading it first.

### Solution

Add a URL input field to `SendImagePage.vue`. The image is fetched via `@tauri-apps/plugin-http` (CORS-free) and fed into the same pipeline as file uploads.

### Flow

```
Paste URL → Fetch via Tauri HTTP → ArrayBuffer → Blob → URL.createObjectURL → img.onload → HTMLImageElement → ImageCropper → Preview → Send
```

### Implementation

- Text input + "Charger" button added to `SendImagePage.vue`
- Fetch pipeline: Tauri `fetch` from `@tauri-apps/plugin-http` (not browser `globalThis.fetch`) → `response.arrayBuffer()` → `new Blob([buffer])` → `URL.createObjectURL(blob)` → load into `HTMLImageElement`
- Both inputs (file / URL) set the same `sourceImage: HTMLImageElement` state
- Error handling for invalid URLs, unreachable hosts, non-image responses

### Files

| File | Action |
|---|---|
| `src/pages/SendImagePage.vue` | **Modified** — add URL input field and fetch logic |
| `src-tauri/capabilities/default.json` | **Modified** — allow HTTP requests to image URLs (`http://*`, `https://*`) |

### Security note

Opening HTTP permissions to `http://*` and `https://*` is broad but necessary here: users provide arbitrary image URLs. These new entries coexist with the existing scoped entries (`http://*:80/post`, `https://app.divoom-gz.com/*`). This is a conscious trade-off — the Tauri HTTP plugin only allows requests from the app (not arbitrary web content), so the attack surface is limited to what the user deliberately inputs.

### Acceptance criteria

- Pasting a valid image URL loads the image into the cropper
- Invalid URLs show a clear error message
- Fetched images go through the same crop → preview → send pipeline

---

## 3. Community Gallery

### Strategy

1. **Investigate** Divoom cloud gallery endpoints (reverse-engineering via community libraries, network sniffing)
2. **If feasible**: implement browse + search gallery
3. **If blocked** (auth required, endpoints unavailable): fallback to local favorites system

### Scenario A — Divoom Cloud Gallery

#### Flow

```
Browse categories → Image list → Select → Preview 64x64 → Send
Search by keyword → Results → Select → Preview 64x64 → Send
```

#### Files

| File | Action |
|---|---|
| `src/services/divoom/gallery.ts` | **New** — cloud gallery API calls |
| `src/pages/GalleryPage.vue` | **New** — browse + search page |
| `src/components/gallery/GalleryGrid.vue` | **New** — thumbnail grid |
| `src/components/gallery/GallerySearch.vue` | **New** — search bar |
| `src/router/index.ts` | **Modified** — add `/gallery` route |
| `src/components/layout/SideNav.vue` | **Modified** — add gallery link |

### Scenario B — Local Favorites (fallback)

If Divoom APIs are inaccessible, images sent to the Pixoo are saved locally and can be re-sent.

#### Flow

```
Send/crop image → "Sauvegarder en favori" button → Favorites page → Re-send in one click
```

#### Files

| File | Action |
|---|---|
| `src/stores/favorites.ts` | **New** — Pinia store, persisted via Tauri Store |
| `src/pages/FavoritesPage.vue` | **New** — favorites grid with delete/re-send |
| `src/pages/SendImagePage.vue` | **Modified** — "Save as favorite" button after cropping |
| `src/router/index.ts` | **Modified** — add `/favorites` route |
| `src/components/layout/SideNav.vue` | **Modified** — add favorites link |

### Acceptance criteria (Scenario A)

- User can browse gallery by categories
- User can search by keyword
- Selecting an image shows 64x64 preview
- User can send selected image to device

### Acceptance criteria (Scenario B)

- User can save cropped images as favorites via a dedicated button
- Favorites page shows all saved images as a grid
- User can re-send a favorite in one click
- User can delete favorites

---

## Implementation Order

1. **Image Cropper** — improves existing functionality, no external dependency
2. **URL Import** — small addition, reuses cropper
3. **Gallery investigation** — research Divoom APIs feasibility
4. **Gallery or Favorites** — implement based on investigation results

## Technical Notes

- Pan + zoom state is local to `ImageCropper.vue` (no store needed)
- URL fetch uses `@tauri-apps/plugin-http` to avoid CORS
- Favorites use a **separate store file** (`favorites.json`) to avoid bloating `settings.json`
- Each favorite stores: `{ id: string, dataUrl: string, createdAt: number, label?: string }` where `dataUrl` is a PNG data URL of the 64x64 image
- `@tauri-apps/plugin-http` is already installed (used for device communication and discovery)
- All new pages require `meta: { requiresDevice: true }` in router
- The cropper debounces preview updates at ~100ms to avoid excessive redraws
- Touch/trackpad: out of scope for now (mouse events only), can be added later
- `ImageUploader.vue` remains unchanged — it still emits an `HTMLImageElement`, which is now consumed by the cropper instead of going directly to resize
- `resizeToCanvas` in `image.ts` is superseded by `extractCrop` for the send-image flow but kept for backward compatibility
- No hard limit on favorites count initially; revisit if `favorites.json` grows too large
