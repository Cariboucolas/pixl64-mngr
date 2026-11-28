<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import type { Sequence } from '../../services/divoom/sequence'
import PixelGrid from '../atoms/PixelGrid.vue'

const props = withDefaults(
  defineProps<{
    /** What to show; without one, the screen is drawn unlit. */
    sequence: Sequence | null
    /** Width of one device pixel on screen, in CSS pixels. */
    cell?: number
    label: string
    /** A paused animation shows its first frame. */
    playing?: boolean
  }>(),
  { cell: 4, playing: true },
)

const index = ref(0)
let timer: ReturnType<typeof setInterval> | null = null

const frame = computed(
  () =>
    props.sequence?.frames[index.value] ?? props.sequence?.frames[0] ?? null,
)

const stop = () => {
  if (timer) clearInterval(timer)
  timer = null
}

const restart = () => {
  stop()
  index.value = 0
  const sequence = props.sequence
  if (!props.playing || !sequence || sequence.frames.length < 2) return
  timer = setInterval(() => {
    index.value = (index.value + 1) % sequence.frames.length
  }, sequence.frameDurationMs)
}

watch([() => props.sequence, () => props.playing], restart, { immediate: true })
onBeforeUnmount(stop)
</script>

<template>
  <PixelGrid :frame="frame" :cell="cell" :label="label" />
</template>
