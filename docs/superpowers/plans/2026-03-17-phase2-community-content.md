# Phase 2 — Community & Content Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add image cropping (pan+zoom), URL import, and community gallery/favorites to Pixl64 Mngr.

**Architecture:** Three incremental features built on the existing SendImagePage pipeline. The cropper component inserts between image loading and preview. URL import adds an alternate input method. Gallery/favorites adds a new page with its own store.

**Tech Stack:** Vue 3, TypeScript, Pinia, Canvas API, @tauri-apps/plugin-http, @tauri-apps/plugin-store, Vitest

---

## File Structure

| File | Responsibility | Action |
|---|---|---|
| `src/services/divoom/image.ts` | Image processing utilities | Modify — add `extractCrop` |
| `tests/services/image.test.ts` | Tests for image utilities | Modify — add `extractCrop` tests |
| `src/components/image/ImageCropper.vue` | Pan+zoom cropping canvas | Create |
| `src/pages/SendImagePage.vue` | Send image page | Modify — integrate cropper + URL input |
| `src-tauri/capabilities/default.json` | Tauri HTTP permissions | Modify — broaden URL scope |
| `src/stores/favorites.ts` | Favorites Pinia store | Create |
| `src/pages/FavoritesPage.vue` | Favorites grid page | Create |
| `src/router/index.ts` | App routes | Modify — add `/favorites` |
| `src/components/layout/SideNav.vue` | Navigation links | Modify — add Favoris link |

---

## Chunk 1: Image Cropper

### Task 1: `extractCrop` — Test

**Files:**
- Modify: `tests/services/image.test.ts`

- [ ] **Step 1: Write the failing test for `extractCrop`**

`extractCrop` uses Canvas API internally (`drawImage`, `getImageData`). Since jsdom doesn't support canvas rendering, we extract the **coordinate math** into a testable pure function `computeCropParams`, and test that instead.

```ts
// tests/services/image.test.ts — add to existing file
import { computeCropParams } from '../../src/services/divoom/image'

describe('computeCropParams', () => {
  it('returns full source when image fits inside output', () => {
    // 50x50 image, no offset, scale 1, output 64 → fits entirely
    const params = computeCropParams(50, 50, 0, 0, 1, 64)
    expect(params.sx).toBe(0)
    expect(params.sy).toBe(0)
    expect(params.sw).toBe(50)
    expect(params.sh).toBe(50)
    expect(params.dw).toBe(50)
    expect(params.dh).toBe(50)
  })

  it('clips source that overflows the output canvas', () => {
    // 100x100 image, no offset, scale 1, output 64 → clipped to 64x64
    const params = computeCropParams(100, 100, 0, 0, 1, 64)
    expect(params.dw).toBe(64)
    expect(params.dh).toBe(64)
    expect(params.sw).toBe(64) // only 64px of source visible
    expect(params.sh).toBe(64)
  })

  it('clips negative offset (panned left/up)', () => {
    // 100x100 image, offset -20, scale 1, output 64
    const params = computeCropParams(100, 100, -20, -10, 1, 64)
    expect(params.dx).toBe(0) // clipped to 0
    expect(params.dy).toBe(0)
    expect(params.sx).toBe(20) // source starts 20px in
    expect(params.sy).toBe(10)
    expect(params.dw).toBe(64) // still fills output
  })

  it('applies scale correctly', () => {
    // 50x50 image, scale 2, output 64 → scaled to 100x100, clipped to 64x64
    const params = computeCropParams(50, 50, 0, 0, 2, 64)
    expect(params.dw).toBe(64) // clipped
    expect(params.sw).toBe(32) // 64/2 = 32px of source visible
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/services/image.test.ts`
Expected: FAIL — `computeCropParams` is not exported from `image.ts`

- [ ] **Step 3: Commit**

```bash
git add tests/services/image.test.ts
git commit -m "test: add failing test for extractCrop signature"
```

---

### Task 2: `extractCrop` — Implementation

**Files:**
- Modify: `src/services/divoom/image.ts`

- [ ] **Step 1: Implement `computeCropParams` and `extractCrop`**

Add to `src/services/divoom/image.ts`:

```ts
export interface CropDrawParams {
  sx: number; sy: number; sw: number; sh: number
  dx: number; dy: number; dw: number; dh: number
}

export const computeCropParams = (
  sourceWidth: number,
  sourceHeight: number,
  offsetX: number,
  offsetY: number,
  scale: number,
  size: number,
): CropDrawParams => {
  // Display-space values: where the source is drawn on the output canvas
  const dw = sourceWidth * scale
  const dh = sourceHeight * scale
  const dx = offsetX
  const dy = offsetY

  // Clip to the output canvas bounds [0, size]
  const clippedDx = Math.max(0, dx)
  const clippedDy = Math.max(0, dy)
  const clippedDw = Math.min(dx + dw, size) - clippedDx
  const clippedDh = Math.min(dy + dh, size) - clippedDy

  // Map clipped display coords back to source coords
  const sx = (clippedDx - dx) / scale
  const sy = (clippedDy - dy) / scale
  const sw = clippedDw / scale
  const sh = clippedDh / scale

  return { sx, sy, sw, sh, dx: clippedDx, dy: clippedDy, dw: clippedDw, dh: clippedDh }
}

export const extractCrop = (
  source: HTMLImageElement | HTMLCanvasElement,
  offsetX: number,
  offsetY: number,
  scale: number,
  size: number = 64,
): ImageData => {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D context unavailable')

  ctx.imageSmoothingEnabled = false

  const sourceWidth = source instanceof HTMLImageElement ? source.naturalWidth : source.width
  const sourceHeight = source instanceof HTMLImageElement ? source.naturalHeight : source.height

  const params = computeCropParams(sourceWidth, sourceHeight, offsetX, offsetY, scale, size)

  ctx.drawImage(
    source,
    params.sx, params.sy, params.sw, params.sh,
    params.dx, params.dy, params.dw, params.dh,
  )

  return ctx.getImageData(0, 0, size, size)
}
```

**How it works:**
- `computeCropParams` is a **pure function** — testable without Canvas API
- `extractCrop` uses it internally for the actual `drawImage` call
- The `size x size` canvas represents the crop output (64x64)
- `scale` controls how much of the source is visible (zoom)
- `offsetX/Y` controls the pan position

- [ ] **Step 2: Run test to verify it passes**

Run: `pnpm vitest run tests/services/image.test.ts`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/services/divoom/image.ts
git commit -m "feat: add extractCrop function for pan+zoom cropping"
```

---

### Task 3: `ImageCropper.vue` — Component

**Files:**
- Create: `src/components/image/ImageCropper.vue`

- [ ] **Step 1: Create the ImageCropper component**

```vue
<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { extractCrop } from '../../services/divoom/image'

const props = defineProps<{
  source: HTMLImageElement | null
}>()

const emit = defineEmits<{
  crop: [imageData: ImageData]
}>()

const canvasRef = ref<HTMLCanvasElement>()
const CANVAS_SIZE = 300

const offsetX = ref(0)
const offsetY = ref(0)
const scale = ref(1)
const dragging = ref(false)
const lastMouse = ref({ x: 0, y: 0 })

let debounceTimer: ReturnType<typeof setTimeout> | null = null

const resetState = () => {
  if (!props.source) return
  const sourceWidth = props.source.naturalWidth
  const sourceHeight = props.source.naturalHeight
  scale.value = CANVAS_SIZE / Math.max(sourceWidth, sourceHeight)
  offsetX.value = (CANVAS_SIZE - sourceWidth * scale.value) / 2
  offsetY.value = (CANVAS_SIZE - sourceHeight * scale.value) / 2
}

const draw = () => {
  const canvas = canvasRef.value
  if (!canvas || !props.source) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)
  ctx.imageSmoothingEnabled = false

  const sourceWidth = props.source.naturalWidth
  const sourceHeight = props.source.naturalHeight
  const scaledWidth = sourceWidth * scale.value
  const scaledHeight = sourceHeight * scale.value

  ctx.drawImage(
    props.source,
    0, 0, sourceWidth, sourceHeight,
    offsetX.value, offsetY.value, scaledWidth, scaledHeight,
  )
}

const emitCrop = () => {
  if (!props.source) return
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    const imageData = extractCrop(
      props.source!,
      offsetX.value * (64 / CANVAS_SIZE),
      offsetY.value * (64 / CANVAS_SIZE),
      scale.value * (64 / CANVAS_SIZE),
      64,
    )
    emit('crop', imageData)
  }, 100)
}

const onMouseDown = (e: MouseEvent) => {
  dragging.value = true
  lastMouse.value = { x: e.clientX, y: e.clientY }
}

const onMouseMove = (e: MouseEvent) => {
  if (!dragging.value) return
  offsetX.value += e.clientX - lastMouse.value.x
  offsetY.value += e.clientY - lastMouse.value.y
  lastMouse.value = { x: e.clientX, y: e.clientY }
  draw()
  emitCrop()
}

const onMouseUp = () => {
  dragging.value = false
}

const onWheel = (e: WheelEvent) => {
  e.preventDefault()
  const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1
  const rect = canvasRef.value?.getBoundingClientRect()
  if (!rect) return

  const mouseX = e.clientX - rect.left
  const mouseY = e.clientY - rect.top

  const newScale = scale.value * zoomFactor
  offsetX.value = mouseX - (mouseX - offsetX.value) * (newScale / scale.value)
  offsetY.value = mouseY - (mouseY - offsetY.value) * (newScale / scale.value)
  scale.value = newScale

  draw()
  emitCrop()
}

onUnmounted(() => {
  if (debounceTimer) clearTimeout(debounceTimer)
})

watch(() => props.source, () => {
  if (!props.source) return
  resetState()
  draw()
  emitCrop()
})

onMounted(() => {
  if (props.source) {
    resetState()
    draw()
    emitCrop()
  }
})
</script>

<template>
  <div class="image-cropper">
    <canvas
      ref="canvasRef"
      :width="CANVAS_SIZE"
      :height="CANVAS_SIZE"
      @mousedown="onMouseDown"
      @mousemove="onMouseMove"
      @mouseup="onMouseUp"
      @mouseleave="onMouseUp"
      @wheel.prevent="onWheel"
    />
    <p v-if="!source" class="placeholder">Chargez une image pour la cadrer</p>
  </div>
</template>

<style scoped>
.image-cropper {
  display: flex;
  justify-content: center;
}

canvas {
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  cursor: grab;
}

canvas:active {
  cursor: grabbing;
}

.placeholder {
  width: 300px;
  height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px dashed var(--color-border);
  border-radius: var(--radius);
  color: var(--color-text-secondary);
  font-size: 0.85rem;
}
</style>
```

**Key concepts:**
- `CANVAS_SIZE` (300px) is the interactive canvas where the user drags/zooms
- `resetState()` fits the image centered in the canvas on load
- `draw()` redraws the canvas on every pan/zoom change
- `emitCrop()` debounces the 64x64 extraction and emits to parent
- Zoom uses the mouse position as anchor (zoom towards cursor)
- The ratio `64 / CANVAS_SIZE` converts display coordinates to output coordinates

- [ ] **Step 2: Verify the component renders**

Run: `pnpm tauri dev` → navigate to Send Image → upload an image → the cropper should appear with the image centered.

- [ ] **Step 3: Commit**

```bash
git add src/components/image/ImageCropper.vue
git commit -m "feat: add ImageCropper component with pan and zoom"
```

---

### Task 4: Integrate Cropper into SendImagePage

**Files:**
- Modify: `src/pages/SendImagePage.vue`

- [ ] **Step 1: Update SendImagePage to use the cropper**

Replace the current `SendImagePage.vue` content:

```vue
<script setup lang="ts">
import { ref } from 'vue'
import ImageCropper from '../components/image/ImageCropper.vue'
import ImagePreview from '../components/image/ImagePreview.vue'
import ImageUploader from '../components/image/ImageUploader.vue'
import { sendStaticImage } from '../services/divoom/image'
import { useDeviceStore } from '../stores/device'

const deviceStore = useDeviceStore()
const sourceImage = ref<HTMLImageElement | null>(null)
const croppedData = ref<ImageData | null>(null)
const sending = ref(false)
const status = ref<string | null>(null)

const onImageLoaded = (img: HTMLImageElement) => {
  sourceImage.value = img
  croppedData.value = null
  status.value = null
}

const onCrop = (imageData: ImageData) => {
  croppedData.value = imageData
}

const sendToDevice = async () => {
  const client = deviceStore.getClient()
  if (!client || !croppedData.value) return

  sending.value = true
  status.value = null

  try {
    await sendStaticImage(client, croppedData.value)
    status.value = 'Image envoyée !'
  } catch (e) {
    status.value = e instanceof Error ? e.message : "Erreur lors de l'envoi"
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <div class="page">
    <h1>Envoyer une image</h1>

    <div class="send-layout">
      <ImageUploader @load="onImageLoaded" />

      <div class="cropper-preview">
        <ImageCropper :source="sourceImage" @crop="onCrop" />
        <ImagePreview :image-data="croppedData" />
      </div>

      <button
        class="primary"
        :disabled="!croppedData || !deviceStore.isReady || sending"
        @click="sendToDevice"
      >
        {{ sending ? 'Envoi...' : 'Envoyer au Pixoo-64' }}
      </button>

      <p v-if="status" :class="status.includes('Erreur') ? 'error' : 'success'">
        {{ status }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.send-layout {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  align-items: flex-start;
}

.cropper-preview {
  display: flex;
  gap: 1.5rem;
  align-items: flex-start;
}

.error {
  color: var(--color-danger);
  font-size: 0.85rem;
}

.success {
  color: var(--color-success);
  font-size: 0.85rem;
}
</style>
```

**Key changes:**
- `sourceImage` holds the raw `HTMLImageElement` (was `imageData` holding the resized result)
- `croppedData` replaces `imageData` — it's the 64x64 output from the cropper
- The layout puts cropper and preview side by side (`cropper-preview` flex row)
- `resizeToCanvas` is no longer called directly — `extractCrop` inside the cropper handles it
- Removed the `.hint` about not being connected (navigation guard already handles this)

- [ ] **Step 2: Test the full flow**

Run: `pnpm tauri dev` → Send Image → upload an image →
1. Image appears in the cropper (300x300 canvas)
2. Drag to pan, scroll to zoom
3. Preview updates in real time (64x64 pixelated)
4. Click "Envoyer" → image appears on the Pixoo

- [ ] **Step 3: Commit**

```bash
git add src/pages/SendImagePage.vue
git commit -m "feat: integrate ImageCropper into SendImagePage"
```

---

## Chunk 2: URL Import

### Task 5: Tauri HTTP Permissions

**Files:**
- Modify: `src-tauri/capabilities/default.json`

- [ ] **Step 1: Broaden HTTP permissions for image fetching**

Add two new URL entries to the `http:default` allow list. Keep existing entries for device communication:

```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default",
  "description": "Capability for the main window",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "opener:default",
    {
      "identifier": "http:default",
      "allow": [
        { "url": "http://*:80/post" },
        { "url": "https://app.divoom-gz.com/*" },
        { "url": "http://*" },
        { "url": "https://*" }
      ]
    },
    "store:default"
  ]
}
```

**Why:** Users provide arbitrary image URLs. The Tauri HTTP plugin scopes requests to the app only (not arbitrary web content), so the attack surface is limited.

- [ ] **Step 2: Verify app still starts**

Run: `pnpm tauri dev` — no permission errors in console.

- [ ] **Step 3: Commit**

```bash
git add src-tauri/capabilities/default.json
git commit -m "feat: broaden HTTP permissions for image URL fetching"
```

---

### Task 6: URL Input in SendImagePage

**Files:**
- Modify: `src/pages/SendImagePage.vue`

- [ ] **Step 1: Add URL import to SendImagePage**

Add these elements to the `<script setup>`:

```ts
import { fetch } from '@tauri-apps/plugin-http'

const imageUrl = ref('')
const urlLoading = ref(false)
const urlError = ref<string | null>(null)

const loadFromUrl = async () => {
  const url = imageUrl.value.trim()
  if (!url) return

  urlLoading.value = true
  urlError.value = null

  try {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)

    const buffer = await response.arrayBuffer()
    const blob = new Blob([buffer])
    const objectUrl = URL.createObjectURL(blob)

    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      onImageLoaded(img)
      urlLoading.value = false
    }
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      urlError.value = "Le fichier n'est pas une image valide"
      urlLoading.value = false
    }
    img.src = objectUrl
  } catch (e) {
    urlError.value = e instanceof Error ? e.message : 'Erreur de chargement'
    urlLoading.value = false
  }
}
```

Add to the `<template>`, after `<ImageUploader>`:

```html
<div class="url-form">
  <span class="separator">ou</span>
  <form @submit.prevent="loadFromUrl" class="url-input-group">
    <input
      v-model="imageUrl"
      type="url"
      placeholder="https://example.com/image.png"
      :disabled="urlLoading"
    />
    <button
      class="primary"
      type="submit"
      :disabled="urlLoading || !imageUrl.trim()"
    >
      {{ urlLoading ? 'Chargement...' : 'Charger' }}
    </button>
  </form>
  <p v-if="urlError" class="error">{{ urlError }}</p>
</div>
```

Add to `<style scoped>`:

```css
.url-form {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.separator {
  color: var(--color-text-secondary);
  font-size: 0.85rem;
}

.url-input-group {
  display: flex;
  gap: 0.5rem;
}

.url-input-group input {
  flex: 1;
  min-width: 250px;
}
```

- [ ] **Step 2: Test URL import**

Run: `pnpm tauri dev` → Send Image →
1. Paste a valid image URL → click "Charger" → image appears in cropper
2. Paste an invalid URL → error message appears
3. Both file upload and URL import feed the same cropper/preview

- [ ] **Step 3: Commit**

```bash
git add src/pages/SendImagePage.vue
git commit -m "feat: add URL import to SendImagePage"
```

---

## Chunk 3: Local Favorites

### Task 7: Favorites Store

**Files:**
- Create: `src/stores/favorites.ts`

- [ ] **Step 1: Create the favorites store**

```ts
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { load, type Store } from '@tauri-apps/plugin-store'

export interface Favorite {
  id: string
  dataUrl: string
  createdAt: number
  label?: string
}

export const useFavoritesStore = defineStore('favorites', () => {
  const items = ref<Favorite[]>([])
  const loaded = ref(false)
  let store: Store | null = null

  const getStore = async (): Promise<Store> => {
    if (!store) {
      store = await load('favorites.json', { defaults: {} })
    }
    return store
  }

  const hydrate = async (): Promise<void> => {
    const s = await getStore()
    const saved = await s.get<Favorite[]>('favorites')
    if (saved) items.value = saved
    loaded.value = true
  }

  const persist = async (): Promise<void> => {
    const s = await getStore()
    await s.set('favorites', items.value)
    await s.save()
  }

  const add = async (dataUrl: string, label?: string): Promise<void> => {
    const favorite: Favorite = {
      id: crypto.randomUUID(),
      dataUrl,
      createdAt: Date.now(),
      label,
    }
    items.value.unshift(favorite)
    await persist()
  }

  const remove = async (id: string): Promise<void> => {
    items.value = items.value.filter((f) => f.id !== id)
    await persist()
  }

  return { items, loaded, hydrate, add, remove }
})
```

**Key concepts:**
- Separate `favorites.json` store file (not `settings.json`) to avoid bloating
- `crypto.randomUUID()` for unique IDs
- `unshift` to show newest first
- `persist()` called after every mutation

- [ ] **Step 2: Verify it compiles**

Run: `pnpm tauri dev` — no errors.

- [ ] **Step 3: Commit**

```bash
git add src/stores/favorites.ts
git commit -m "feat: add favorites Pinia store with persistence"
```

---

### Task 8: ImageData ↔ Data URL utilities

**Files:**
- Modify: `src/services/divoom/image.ts`

- [ ] **Step 1: Add `imageDataToDataUrl` and `dataUrlToImageData` utilities**

Add to `src/services/divoom/image.ts`:

```ts
export const imageDataToDataUrl = (imageData: ImageData): string => {
  const canvas = document.createElement('canvas')
  canvas.width = imageData.width
  canvas.height = imageData.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D context unavailable')
  ctx.putImageData(imageData, 0, 0)
  return canvas.toDataURL('image/png')
}

export const dataUrlToImageData = (dataUrl: string, size: number = 64): Promise<ImageData> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('Canvas 2D context unavailable')); return }
      ctx.drawImage(img, 0, 0, size, size)
      resolve(ctx.getImageData(0, 0, size, size))
    }
    img.onerror = () => reject(new Error('Impossible de charger le favori'))
    img.src = dataUrl
  })
}
```

**Why:**
- `imageDataToDataUrl` — serialize `ImageData` to PNG data URL for storage
- `dataUrlToImageData` — deserialize back for sending to the Pixoo (favorites are already 64x64, no resize needed)

- [ ] **Step 2: Commit**

```bash
git add src/services/divoom/image.ts
git commit -m "feat: add imageDataToDataUrl and dataUrlToImageData utilities"
```

---

### Task 9: Save as Favorite in SendImagePage

**Files:**
- Modify: `src/pages/SendImagePage.vue`

- [ ] **Step 1: Add "Save as favorite" button**

Add to `<script setup>`:

```ts
import { useFavoritesStore } from '../stores/favorites'
import { imageDataToDataUrl } from '../services/divoom/image'

const favoritesStore = useFavoritesStore()

const saveAsFavorite = async () => {
  if (!croppedData.value) return
  const dataUrl = imageDataToDataUrl(croppedData.value)
  await favoritesStore.add(dataUrl)
  status.value = 'Ajouté aux favoris !'
}
```

Add to the `<template>`, after the send button:

```html
<button
  class="secondary"
  :disabled="!croppedData"
  @click="saveAsFavorite"
>
  Sauvegarder en favori
</button>
```

- [ ] **Step 2: Test**

Run: `pnpm tauri dev` → Upload image → Crop → Click "Sauvegarder en favori" → Message "Ajouté aux favoris !" appears.

- [ ] **Step 3: Commit**

```bash
git add src/pages/SendImagePage.vue
git commit -m "feat: add save-as-favorite button to SendImagePage"
```

---

### Task 10: Favorites Page

**Files:**
- Create: `src/pages/FavoritesPage.vue`

- [ ] **Step 1: Create FavoritesPage**

```vue
<script setup lang="ts">
import { onMounted } from 'vue'
import { sendStaticImage } from '../services/divoom/image'
import { useDeviceStore } from '../stores/device'
import { useFavoritesStore } from '../stores/favorites'
import type { Favorite } from '../stores/favorites'
import { ref } from 'vue'
import { dataUrlToImageData } from '../services/divoom/image'

const deviceStore = useDeviceStore()
const favoritesStore = useFavoritesStore()
const sendingId = ref<string | null>(null)
const status = ref<string | null>(null)

onMounted(async () => {
  await favoritesStore.hydrate()
})

const sendFavorite = async (favorite: Favorite) => {
  const client = deviceStore.getClient()
  if (!client) return

  sendingId.value = favorite.id
  status.value = null

  try {
    const imageData = await dataUrlToImageData(favorite.dataUrl)
    await sendStaticImage(client, imageData)
    status.value = 'Image envoyée !'
  } catch (e) {
    status.value = e instanceof Error ? e.message : "Erreur lors de l'envoi"
  } finally {
    sendingId.value = null
  }
}

const removeFavorite = async (id: string) => {
  await favoritesStore.remove(id)
}
</script>

<template>
  <div class="page">
    <h1>Favoris</h1>

    <p v-if="status" :class="status.includes('Erreur') ? 'error' : 'success'">
      {{ status }}
    </p>

    <div v-if="favoritesStore.items.length" class="favorites-grid">
      <div
        v-for="fav in favoritesStore.items"
        :key="fav.id"
        class="favorite-card"
      >
        <img :src="fav.dataUrl" :alt="fav.label || 'Favori'" class="favorite-img" />
        <div class="favorite-actions">
          <button
            class="primary small"
            :disabled="sendingId === fav.id || !deviceStore.connected"
            @click="sendFavorite(fav)"
          >
            {{ sendingId === fav.id ? 'Envoi...' : 'Envoyer' }}
          </button>
          <button
            class="danger small"
            @click="removeFavorite(fav.id)"
          >
            Supprimer
          </button>
        </div>
      </div>
    </div>

    <p v-else class="hint">
      Aucun favori. Envoyez une image et sauvegardez-la en favori.
    </p>
  </div>
</template>

<style scoped>
.favorites-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 1rem;
}

.favorite-card {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  align-items: center;
}

.favorite-img {
  width: 80px;
  height: 80px;
  image-rendering: pixelated;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
}

.favorite-actions {
  display: flex;
  gap: 0.25rem;
}

.small {
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
}

.error {
  color: var(--color-danger);
  font-size: 0.85rem;
}

.success {
  color: var(--color-success);
  font-size: 0.85rem;
}

.hint {
  color: var(--color-text-secondary);
  font-size: 0.85rem;
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/FavoritesPage.vue
git commit -m "feat: add FavoritesPage with grid, send, and delete"
```

---

### Task 11: Route + Navigation

**Files:**
- Modify: `src/router/index.ts`
- Modify: `src/components/layout/SideNav.vue`

- [ ] **Step 1: Add favorites route**

Add to `src/router/index.ts`, after the `/send` route:

```ts
{
  path: '/favorites',
  name: 'favorites',
  component: () => import('../pages/FavoritesPage.vue'),
},
```

- [ ] **Step 2: Add favorites link to SideNav**

In `src/components/layout/SideNav.vue`, add after the "Envoyer image" `<li>`:

```html
<li>
  <RouterLink to="/favorites" active-class="active">Favoris</RouterLink>
</li>
```

- [ ] **Step 3: Test the full flow**

Run: `pnpm tauri dev` →
1. Send Image → Upload → Crop → "Sauvegarder en favori"
2. Navigate to Favoris → see the saved image
3. Click "Envoyer" → image sent to device
4. Click "Supprimer" → image removed

- [ ] **Step 4: Commit**

```bash
git add src/router/index.ts src/components/layout/SideNav.vue
git commit -m "feat: add favorites route and navigation link"
```

---

## Chunk 4: Gallery Investigation (Decision Point)

### Task 12: Research Divoom Gallery APIs

**Files:** None — research only

- [ ] **Step 1: Investigate Divoom cloud gallery endpoints**

Research approaches:
1. Search for community libraries: `node-divoom-timebox-evo`, `divoom-api`, `pixoo-rest` on GitHub
2. Look for reverse-engineered API docs in these repos
3. Check if `https://app.divoom-gz.com/` has other endpoints beyond `ReturnSameLANDevice`
4. Search for known endpoints: `/Channel/GetDialType`, `/Channel/GetDialList`, `/Device/GetDialList`

Key questions to answer:
- Are gallery/dial listing endpoints accessible without authentication?
- What data format do they return (image URLs, thumbnails, metadata)?
- Is rate limiting applied?

- [ ] **Step 2: Document findings**

Create `docs/divoom-gallery-research.md` with findings.

- [ ] **Step 3: Decision**

If gallery APIs are accessible → proceed with Scenario A (Tasks 13+)
If blocked → the Favorites system (Tasks 7-11) serves as the fallback. Phase 2 is complete.

- [ ] **Step 4: Commit**

```bash
git add docs/divoom-gallery-research.md
git commit -m "docs: document Divoom gallery API research findings"
```

---

*Tasks 13+ (Gallery implementation) will be planned in a separate plan document after Task 12 research results are known. If Scenario A (Divoom cloud) is feasible, a new plan `phase2b-gallery.md` will be created. If blocked, the Favorites system (Tasks 7-11) serves as the fallback and Phase 2 is complete.*
