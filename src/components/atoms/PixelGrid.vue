<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  GRID_SIZE,
  paintPixelGrid,
  pixelGridMetrics,
} from '../../services/preview/pixelGrid'

const props = withDefaults(
  defineProps<{
    /** The frame to show; without one, the screen is drawn unlit. */
    frame: ImageData | null
    /** Width of one device pixel on screen, in CSS pixels. */
    cell?: number
    label: string
  }>(),
  { cell: 4 },
)

const canvasRef = ref<HTMLCanvasElement>()
const pixelRatio = ref(window.devicePixelRatio || 1)
const metrics = computed(() => pixelGridMetrics(props.cell, pixelRatio.value))

/** The window can move to a screen of another density: the query stops matching and is set up again. */
let densityQuery: MediaQueryList | null = null
const followDensity = () => {
  pixelRatio.value = window.devicePixelRatio || 1
  densityQuery?.removeEventListener('change', followDensity)
  densityQuery = window.matchMedia?.(`(resolution: ${pixelRatio.value}dppx)`)
  densityQuery?.addEventListener('change', followDensity)
}
const displaySize = computed(() => `${GRID_SIZE * props.cell}px`)

const paint = () => {
  const canvas = canvasRef.value
  const ctx = canvas?.getContext('2d')
  if (!canvas || !ctx) return
  canvas.width = metrics.value.size
  canvas.height = metrics.value.size
  paintPixelGrid(ctx, props.frame, metrics.value)
}

watch([() => props.frame, metrics], paint)
onMounted(() => {
  followDensity()
  paint()
})
onBeforeUnmount(() => {
  densityQuery?.removeEventListener('change', followDensity)
})
</script>

<template>
  <canvas
    ref="canvasRef"
    class="pixel-grid"
    role="img"
    :aria-label="label"
    :style="{ width: displaySize, height: displaySize }"
  />
</template>

<style scoped>
.pixel-grid {
  display: block;
  /* The border must sit outside the drawing: any scaling of the canvas makes grid lines uneven. */
  box-sizing: content-box;
  flex: none;
  background-color: #000;
  border: 1px solid var(--color-rule);
  image-rendering: pixelated;
}
</style>
