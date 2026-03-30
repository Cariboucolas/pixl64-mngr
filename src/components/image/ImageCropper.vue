<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { extractCrop } from '../../services/divoom/image.ts'

const CANVAS_SIZE = 300

const props = defineProps<{ source: HTMLImageElement | null }>()
const emit = defineEmits<{ crop: [imageData: ImageData] }>()

const canvasRef = ref<HTMLCanvasElement>()
const offsetX = ref(0)
const offsetY = ref(0)
const scale = ref(1)

const dragging = ref(false)
const lastMousePosition = ref({ x: 0, y: 0 })

let debounceTimer: number | null = null

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
  const context = canvas.getContext('2d')
  if (!context) return
  context.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)
  context.imageSmoothingEnabled = false
  const sourceWidth = props.source.naturalWidth
  const sourceHeight = props.source.naturalHeight
  const scaledWidth = sourceWidth * scale.value
  const scaledHeight = sourceHeight * scale.value

  context.drawImage(
    props.source,
    0,
    0,
    sourceWidth,
    sourceHeight,
    offsetX.value,
    offsetY.value,
    scaledWidth,
    scaledHeight,
  )
}

const emitCrop = () => {
  if (!props.source) return
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    if (!props.source) return
    const imageData = extractCrop(
      props.source,
      offsetX.value * (64 / CANVAS_SIZE),
      offsetY.value * (64 / CANVAS_SIZE),
      scale.value * (64 / CANVAS_SIZE),
      64,
    )
    emit('crop', imageData)
  }, 100)
}

onUnmounted(() => {
  if (debounceTimer) clearTimeout(debounceTimer)
})

const onMouseDown = (event: MouseEvent) => {
  dragging.value = true
  lastMousePosition.value = { x: event.clientX, y: event.clientY }
}

const onMouseMove = (event: MouseEvent) => {
  if (!dragging.value) return
  offsetX.value += event.clientX - lastMousePosition.value.x
  offsetY.value += event.clientY - lastMousePosition.value.y
  lastMousePosition.value = { x: event.clientX, y: event.clientY }
  draw()
  emitCrop()
}

const onMouseUp = () => {
  if (!dragging.value) return
  dragging.value = false
}

const onWheel = (event: WheelEvent) => {
  event.preventDefault()
  const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1

  const rect = canvasRef.value?.getBoundingClientRect()
  if (!rect) return

  const mouseX = event.clientX - rect.left
  const mouseY = event.clientY - rect.top

  const newScale = scale.value * zoomFactor
  offsetX.value = mouseX - (mouseX - offsetX.value) * (newScale / scale.value)
  offsetY.value = mouseY - (mouseY - offsetY.value) * (newScale / scale.value)

  scale.value = newScale

  draw()
  emitCrop()
}

watch(
  () => props.source,
  () => {
    if (!props.source) return
    resetState()
    draw()
    emitCrop()
  },
)

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
    <canvas ref="canvasRef" :width="CANVAS_SIZE" :height="CANVAS_SIZE" @mousedown="onMouseDown" @mousemove="onMouseMove" @mouseup="onMouseUp" @mouseleave="onMouseUp" @wheel.prevent="onWheel" />
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
