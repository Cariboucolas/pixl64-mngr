<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
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
const metrics = computed(() =>
  pixelGridMetrics(props.cell, window.devicePixelRatio || 1),
)
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
onMounted(paint)
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
  background-color: #000;
  border: 1px solid var(--color-rule);
  image-rendering: pixelated;
}
</style>
