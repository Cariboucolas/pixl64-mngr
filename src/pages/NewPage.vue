<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import AnimatedPixelGrid from '../components/molecules/AnimatedPixelGrid.vue'
import ImageCropper from '../components/molecules/ImageCropper.vue'
import SaveToLibraryForm from '../components/molecules/SaveToLibraryForm.vue'
import SendProgress from '../components/molecules/SendProgress.vue'
import SourceImporter from '../components/organisms/SourceImporter.vue'
import { useSource } from '../composables/useSource'
import { deviceErrorMessage } from '../services/divoom/deviceError'
import { validateImageUrl } from '../services/divoom/image'
import { SendCancelled } from '../services/divoom/sequence'
import { libraryErrorMessage } from '../services/library/libraryError'
import { getSourceGateway } from '../services/source/gateway'
import { sourceErrorMessage } from '../services/source/sourceError'
import { useDeviceStore } from '../stores/device'
import { useLibraryStore } from '../stores/library'

type Status = { kind: 'success' | 'error'; message: string }

/** Bounds of the pace the user may set, in milliseconds per frame. */
const MIN_FRAME_DURATION_MS = 10
const MAX_FRAME_DURATION_MS = 10_000

const { t } = useI18n()
const deviceStore = useDeviceStore()
const libraryStore = useLibraryStore()
const source = useSource()

const sourceUrl = ref('')
const urlError = ref<string | null>(null)
const itemLabel = ref('')
const offerToSave = ref(false)
const status = ref<Status | null>(null)
/** Frames sent so far and their total, while a send is running. */
const progress = ref<{ sent: number; total: number } | null>(null)
let cancelSend: (() => void) | null = null

const sequence = computed(() => source.sequence.value)
const sending = computed(() => progress.value !== null)

const forgetOutcome = () => {
  status.value = null
  offerToSave.value = false
}

const openFile = async (file: File) => {
  forgetOutcome()
  urlError.value = null
  await source.openFile(new Uint8Array(await file.arrayBuffer()))
}

const openUrl = async () => {
  const url = sourceUrl.value.trim()
  if (!url) return
  forgetOutcome()
  try {
    // A quick answer for the user; the native side validates again (ADR-0002).
    validateImageUrl(url)
  } catch (e) {
    urlError.value = sourceErrorMessage(e)
    return
  }
  urlError.value = null
  await source.openUrl(url)
}

const setFrameDuration = (event: Event) => {
  const value = Number((event.target as HTMLInputElement).value)
  if (!Number.isFinite(value)) return
  source.setFrameDuration(
    Math.min(MAX_FRAME_DURATION_MS, Math.max(MIN_FRAME_DURATION_MS, value)),
  )
}

const send = async () => {
  const toSend = sequence.value
  if (!toSend) return

  const controller = new AbortController()
  cancelSend = () => controller.abort()
  progress.value = { sent: 0, total: toSend.frames.length }
  forgetOutcome()
  try {
    await deviceStore.send(toSend, {
      signal: controller.signal,
      onProgress: (sent, total) => {
        progress.value = { sent, total }
      },
    })
    status.value = {
      kind: 'success',
      message: source.animated.value ? t('new.animationSent') : t('new.sent'),
    }
    offerToSave.value = true
    itemLabel.value = ''
  } catch (e) {
    status.value = {
      kind: 'error',
      message: e instanceof SendCancelled ? e.message : deviceErrorMessage(e),
    }
  } finally {
    progress.value = null
    cancelSend = null
  }
}

const checkingDirectPlay = ref(false)

/** Hands the URL to the device, once the native side checked it is a GIF the device plays. */
const playDirectly = async () => {
  const url = sourceUrl.value.trim()
  if (!url) return
  forgetOutcome()
  checkingDirectPlay.value = true
  try {
    await getSourceGateway().checkDirectPlay(url)
  } catch (e) {
    status.value = { kind: 'error', message: sourceErrorMessage(e) }
    checkingDirectPlay.value = false
    return
  }
  try {
    await deviceStore.playUrl(url)
    status.value = { kind: 'success', message: t('new.directPlaySent') }
  } catch (e) {
    status.value = { kind: 'error', message: deviceErrorMessage(e) }
  } finally {
    checkingDirectPlay.value = false
  }
}

const saveToLibrary = async () => {
  if (!sequence.value) return
  try {
    await libraryStore.add(sequence.value, itemLabel.value)
    offerToSave.value = false
    status.value = { kind: 'success', message: t('new.saved') }
  } catch (e) {
    status.value = { kind: 'error', message: libraryErrorMessage(e) }
  }
}
</script>

<template>
  <div class="new-page">
    <SourceImporter
      v-model:url="sourceUrl"
      :url-loading="source.loading.value"
      :url-error="urlError"
      @file="openFile"
      @url="openUrl"
    />

    <div v-if="sourceUrl.trim()" class="direct-play">
      <button
        type="button"
        :disabled="!deviceStore.isReady || checkingDirectPlay || sending"
        @click="playDirectly"
      >
        {{ checkingDirectPlay ? t('new.directPlayChecking') : t('new.directPlay') }}
      </button>
      <p class="hint">{{ t('new.directPlayHint') }}</p>
    </div>

    <p v-if="source.loading.value" class="hint" role="status">
      {{ t('new.opening') }}
    </p>
    <p v-if="source.error.value" class="error" role="alert">
      {{ source.error.value }}
    </p>

    <div v-if="source.image.value" class="crop">
      <ImageCropper
        :source="source.image.value"
        @crop="(frame, crop) => source.setCrop(frame, crop)"
      />
      <div class="preview">
        <AnimatedPixelGrid
          :sequence="sequence"
          :label="t('new.previewLabel')"
        />
        <template v-if="source.animated.value && sequence">
          <p class="hint">
            {{ t('new.frameCount', { count: sequence.frames.length }) }}
          </p>
          <p v-if="source.reducedFrom.value" class="hint" role="status">
            {{
              t('new.reduced', {
                from: source.reducedFrom.value,
                to: sequence.frames.length,
              })
            }}
          </p>
          <label class="pace">
            {{ t('new.frameDuration') }}
            <input
              type="number"
              :min="MIN_FRAME_DURATION_MS"
              :max="MAX_FRAME_DURATION_MS"
              step="10"
              :value="sequence.frameDurationMs"
              :disabled="sending"
              @change="setFrameDuration"
            />
          </label>
        </template>
      </div>
    </div>
    <p v-else-if="!source.loading.value" class="hint">
      {{ t('new.sourceHint') }}
    </p>

    <SendProgress
      v-if="progress"
      :sent="progress.sent"
      :total="progress.total"
      :label="t('new.progress', { ...progress })"
      :cancel-label="t('new.cancelSend')"
      @cancel="cancelSend?.()"
    />
    <button
      v-else
      class="primary"
      type="button"
      :disabled="!sequence || !deviceStore.isReady"
      @click="send"
    >
      {{ t('new.send') }}
    </button>

    <p v-if="status" :class="status.kind" role="status">{{ status.message }}</p>

    <SaveToLibraryForm
      v-if="offerToSave"
      v-model="itemLabel"
      @save="saveToLibrary"
      @dismiss="offerToSave = false"
    />
  </div>
</template>

<style scoped>
.new-page {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-4);
}

.new-page > :first-child {
  align-self: stretch;
  max-width: 640px;
}

.crop {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-5);
  align-items: flex-start;
}
.direct-play {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  max-width: 640px;
}

.direct-play button {
  flex-shrink: 0;
}

.preview {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  max-width: 256px;
}

.pace {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
}

.pace input {
  width: 8rem;
}
</style>
