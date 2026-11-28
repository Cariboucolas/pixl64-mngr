import { computed, ref, shallowRef } from 'vue'
import {
  decodeFrame,
  type Frame,
  type Sequence,
  still,
} from '../services/divoom/sequence'
import {
  type Crop,
  getSourceGateway,
  type OpenedSource,
  type SourceGateway,
} from '../services/source/gateway'
import { sourceErrorMessage } from '../services/source/sourceError'

const loadPng = (base64: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject({ kind: 'invalid' })
    image.src = `data:image/png;base64,${base64}`
  })

interface Dependencies {
  gateway?: SourceGateway
  loadImage?: (firstFrame: string) => Promise<HTMLImageElement>
}

/**
 * A source from its import to the sequence ready to send: opened by the native
 * side, cropped by the user on its first frame, rendered again at each crop.
 */
export const useSource = ({
  gateway,
  loadImage = loadPng,
}: Dependencies = {}) => {
  const native = () => gateway ?? getSourceGateway()

  /** First frame of the source: what the user crops. */
  const image = shallowRef<HTMLImageElement | null>(null)
  const sequence = shallowRef<Sequence | null>(null)
  const frameCount = ref(0)
  /** Frame count of the source when some were dropped, otherwise null. */
  const reducedFrom = ref<number | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const animated = computed(() => frameCount.value > 1)

  /** Set once the user changed the pace: later renders keep it. */
  let chosenDurationMs: number | null = null
  let lastRender = 0

  const reset = () => {
    image.value = null
    sequence.value = null
    frameCount.value = 0
    reducedFrom.value = null
    chosenDurationMs = null
    lastRender++
  }

  const open = async (opening: () => Promise<OpenedSource>) => {
    loading.value = true
    error.value = null
    reset()
    try {
      const opened = await opening()
      image.value = await loadImage(opened.firstFrame)
      frameCount.value = opened.frameCount
    } catch (e) {
      reset()
      error.value = sourceErrorMessage(e)
    } finally {
      loading.value = false
    }
  }

  const openFile = (bytes: Uint8Array) => open(() => native().openFile(bytes))
  const openUrl = (url: string) => open(() => native().openUrl(url))

  /** `frame` is the first frame under this crop, as the cropper drew it. */
  const setCrop = async (frame: Frame, crop: Crop) => {
    if (!animated.value) {
      sequence.value = still(frame)
      return
    }
    const render = ++lastRender
    try {
      const rendered = await native().render(crop)
      // A newer crop was asked for while this one was rendered.
      if (render !== lastRender) return
      sequence.value = {
        frames: rendered.frames.map(decodeFrame),
        frameDurationMs: chosenDurationMs ?? rendered.frameDurationMs,
      }
      reducedFrom.value =
        rendered.sourceFrameCount > rendered.frames.length
          ? rendered.sourceFrameCount
          : null
      error.value = null
    } catch (e) {
      if (render !== lastRender) return
      sequence.value = null
      error.value = sourceErrorMessage(e)
    }
  }

  const setFrameDuration = (frameDurationMs: number) => {
    chosenDurationMs = frameDurationMs
    if (sequence.value) sequence.value = { ...sequence.value, frameDurationMs }
  }

  return {
    image,
    sequence,
    animated,
    reducedFrom,
    loading,
    error,
    openFile,
    openUrl,
    setCrop,
    setFrameDuration,
  }
}
