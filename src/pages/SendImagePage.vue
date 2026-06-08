<script setup lang="ts">
import { invoke } from '@tauri-apps/api/core'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import ImageCropper from '../components/image/ImageCropper.vue'
import ImagePreview from '../components/image/ImagePreview.vue'
import ImageUploader from '../components/image/ImageUploader.vue'
import {
  imageDataToDataUrl,
  sendStaticImage,
  validateImageDimensions,
  validateImageUrl,
} from '../services/divoom/image'
import { useDeviceStore } from '../stores/device'
import { useFavoritesStore } from '../stores/favorites.ts'

interface ImageBytes {
  bytes: number[]
  mime: string
}

const { t } = useI18n()
const deviceStore = useDeviceStore()
const imageUrl = ref('')
const croppedData = ref<ImageData | null>(null)
const favoritesStore = useFavoritesStore()
const favoriteLabel = ref('')
const sending = ref(false)
const showFavoriteForm = ref(false)
const sourceImage = ref<HTMLImageElement | null>(null)
const status = ref<string | null>(null)
const urlError = ref<string | null>(null)
const urlLoading = ref(false)

const loadImageFromBlob = (objectUrl: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(t('send.invalidImage')))
    img.src = objectUrl
  })
}

const loadFromUrl = async () => {
  const rawUrl = imageUrl.value.trim()
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
    const img = await loadImageFromBlob(blobUrl)
    validateImageDimensions(img)
    onImageLoaded(img)
  } catch (e) {
    urlError.value = e instanceof Error ? e.message : t('send.errorLoading')
  } finally {
    if (blobUrl) URL.revokeObjectURL(blobUrl)
    urlLoading.value = false
  }
}

const onImageLoaded = (img: HTMLImageElement) => {
  sourceImage.value = img
  croppedData.value = null
  status.value = null
}

const onCrop = (imageData: ImageData) => {
  croppedData.value = imageData
}

const saveAsFavorite = async () => {
  if (!croppedData.value) return
  const dataUrl = imageDataToDataUrl(croppedData.value)
  await favoritesStore.add(dataUrl, favoriteLabel.value.trim() || undefined)
  showFavoriteForm.value = false
  status.value = t('send.addedToFavorites')
}

const dismissFavoriteForm = () => {
  showFavoriteForm.value = false
}

const sendToDevice = async () => {
  const client = deviceStore.getClient()
  if (!client || !croppedData.value) return

  sending.value = true
  status.value = null

  try {
    await sendStaticImage(client, croppedData.value)
    status.value = t('send.sent')
    showFavoriteForm.value = true
    favoriteLabel.value = ''
  } catch (e) {
    status.value = e instanceof Error ? e.message : t('send.errorSending')
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <div class="page">
    <h1>{{ t('send.title') }}</h1>

    <div class="send-layout">
      <ImageUploader @load="onImageLoaded" />

      <div class="url-form">
        <span class="separator">{{ t('send.or') }}</span>
        <form @submit.prevent="loadFromUrl" class="url-input-group">
          <input
            v-model="imageUrl"
            type="url"
            :placeholder="t('send.urlPlaceholder')"
            :disabled="urlLoading"
          />
          <button
              class="primary"
              type="submit"
              :disabled="urlLoading || !imageUrl.trim()">
            {{ urlLoading ? t('common.loading') : t('send.load') }}
          </button>
          </form>
        <p v-if="urlError" class="error">{{ urlError }}</p>
      </div>

      <div v-if="sourceImage" class="cropper-preview">
        <ImageCropper :source="sourceImage" @crop="onCrop" />
        <ImagePreview :image-data="croppedData" />
      </div>

      <button
        class="primary"
        :disabled="!croppedData || !deviceStore.isReady || sending"
        @click="sendToDevice"
      >
        {{ sending ? t('send.sending') : t('send.sendToPixoo') }}
      </button>

      <div v-if="showFavoriteForm" class="favorite-form">
        <p class="success">{{ t('send.sent') }}</p>
        <label class="favorite-label">
          {{ t('send.favoriteLabelTitle') }}
          <input
              v-model="favoriteLabel"
              type="text"
              :placeholder="t('send.favoriteLabelPlaceholder')"
          />
        </label>
        <div class="favorite-actions">
          <button class="primary" @click="saveAsFavorite">
            {{ t('send.saveAsFavorite') }}
          </button>
          <button @click="dismissFavoriteForm">
            {{ t('send.noThanks') }}
          </button>
        </div>
      </div>

      <p v-else-if="status" :class="status === t('send.errorSending') || status === t('send.errorLoading') ? 'error' : 'success'">
        {{ status }}
      </p>

      <p v-if="!deviceStore.connected" class="hint">
        {{ t('controls.needConnection') }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.favorite-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.favorite-label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.85rem;
  color: var(--color-text-secondary);
}

.favorite-actions {
  display: flex;
  gap: 0.5rem;
}

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

.cropper-preview {
  display: flex;
  gap: 1.5rem;
  align-items: flex-start;
}
.send-layout {
  display: flex;
  flex-direction: column;
  gap: 1rem;
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

.hint {
  color: var(--color-text-secondary);
  font-size: 0.85rem;
}
</style>
