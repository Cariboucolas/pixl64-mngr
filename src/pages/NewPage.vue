<script setup lang="ts">
import { invoke } from '@tauri-apps/api/core'
import { ref, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import PixelGrid from '../components/atoms/PixelGrid.vue'
import ImageCropper from '../components/molecules/ImageCropper.vue'
import SaveToLibraryForm from '../components/molecules/SaveToLibraryForm.vue'
import SourceImporter from '../components/organisms/SourceImporter.vue'
import { deviceErrorMessage } from '../services/divoom/deviceError'
import { fetchImageErrorMessage } from '../services/divoom/fetchImageError'
import {
  imageDataToDataUrl,
  validateImageDimensions,
  validateImageUrl,
} from '../services/divoom/image'
import { useDeviceStore } from '../stores/device'
import { useLibraryStore } from '../stores/library'

interface ImageBytes {
  bytes: number[]
  mime: string
}

type Status = { kind: 'success' | 'error'; message: string }

const { t } = useI18n()
const deviceStore = useDeviceStore()
const libraryStore = useLibraryStore()
const sourceUrl = ref('')
const source = shallowRef<HTMLImageElement | null>(null)
const cropped = shallowRef<ImageData | null>(null)
const itemLabel = ref('')
const sending = ref(false)
const offerToSave = ref(false)
const status = ref<Status | null>(null)
const urlError = ref<string | null>(null)
const urlLoading = ref(false)

const loadImage = (objectUrl: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(t('new.invalidImage')))
    img.src = objectUrl
  })

const useSource = (img: HTMLImageElement) => {
  source.value = img
  cropped.value = null
  status.value = null
  offerToSave.value = false
}

const loadFromUrl = async () => {
  const rawUrl = sourceUrl.value.trim()
  if (!rawUrl) return

  urlLoading.value = true
  urlError.value = null

  let blobUrl: string | null = null
  try {
    validateImageUrl(rawUrl)
    const result = await invoke<ImageBytes>('fetch_image_bytes', {
      url: rawUrl,
    })

    const blob = new Blob([new Uint8Array(result.bytes)], { type: result.mime })
    blobUrl = URL.createObjectURL(blob)
    const img = await loadImage(blobUrl)
    validateImageDimensions(img)
    useSource(img)
  } catch (e) {
    urlError.value = fetchImageErrorMessage(e)
  } finally {
    if (blobUrl) URL.revokeObjectURL(blobUrl)
    urlLoading.value = false
  }
}

const send = async () => {
  if (!cropped.value) return

  sending.value = true
  status.value = null
  try {
    await deviceStore.sendStill(cropped.value)
    status.value = { kind: 'success', message: t('new.sent') }
    offerToSave.value = true
    itemLabel.value = ''
  } catch (e) {
    status.value = { kind: 'error', message: deviceErrorMessage(e) }
  } finally {
    sending.value = false
  }
}

const saveToLibrary = async () => {
  if (!cropped.value) return
  await libraryStore.add(
    imageDataToDataUrl(cropped.value),
    itemLabel.value.trim() || undefined,
  )
  offerToSave.value = false
  status.value = { kind: 'success', message: t('new.saved') }
}
</script>

<template>
  <div class="new-page">
    <SourceImporter
      v-model:url="sourceUrl"
      :url-loading="urlLoading"
      :url-error="urlError"
      @file="useSource"
      @url="loadFromUrl"
    />

    <div v-if="source" class="crop">
      <ImageCropper :source="source" @crop="cropped = $event" />
      <PixelGrid :frame="cropped" :label="t('new.previewLabel')" />
    </div>
    <p v-else class="hint">{{ t('new.sourceHint') }}</p>

    <button
      class="primary"
      type="button"
      :disabled="!cropped || !deviceStore.isReady || sending"
      @click="send"
    >
      {{ sending ? t('new.sending') : t('new.send') }}
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
</style>
