<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'

const props = defineProps<{
  imageData: ImageData | null
}>()

const canvasRef = ref<HTMLCanvasElement>()
const PIXEL_SIZE = 4
const GRID_SIZE = 64

function draw() {
  const canvas = canvasRef.value
  if (!canvas || !props.imageData) return

  const ctx = canvas.getContext('2d')!
  const displaySize = GRID_SIZE * PIXEL_SIZE
  canvas.width = displaySize
  canvas.height = displaySize

  ctx.imageSmoothingEnabled = false

  const tempCanvas = document.createElement('canvas')
  tempCanvas.width = props.imageData.width
  tempCanvas.height = props.imageData.height
  const tempCtx = tempCanvas.getContext('2d')!
  tempCtx.putImageData(props.imageData, 0, 0)

  ctx.drawImage(tempCanvas, 0, 0, displaySize, displaySize)

  // Grid
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'
  ctx.lineWidth = 0.5
  for (let i = 0; i <= GRID_SIZE; i++) {
    const pos = i * PIXEL_SIZE
    ctx.beginPath()
    ctx.moveTo(pos, 0)
    ctx.lineTo(pos, displaySize)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(0, pos)
    ctx.lineTo(displaySize, pos)
    ctx.stroke()
  }
}

watch(() => props.imageData, draw)
onMounted(draw)
</script>

<template>
  <div class="image-preview">
    <canvas ref="canvasRef" v-show="imageData"></canvas>
    <div v-if="!imageData" class="placeholder">
      Aucune image sélectionnée
    </div>
  </div>
</template>

<style scoped>
.image-preview {
  display: flex;
  justify-content: center;
}

canvas {
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  image-rendering: pixelated;
}

.placeholder {
  width: 256px;
  height: 256px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px dashed var(--color-border);
  border-radius: var(--radius);
  color: var(--color-text-secondary);
  font-size: 0.85rem;
}
</style>
