<script setup lang="ts">
import { fetch } from '@tauri-apps/plugin-http'
import { ref } from 'vue'
import ImageCropper from '../components/image/ImageCropper.vue'
import ImagePreview from '../components/image/ImagePreview.vue'
import ImageUploader from '../components/image/ImageUploader.vue'
import { sendStaticImage } from '../services/divoom/image'
import { useDeviceStore } from '../stores/device'

const MAX_FILE_SIZE_MB = 20
const MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024
const MAX_IMAGE_DIMENSION = 10_000

const deviceStore = useDeviceStore()
const sourceImage = ref<HTMLImageElement | null>(null)
const croppedData = ref<ImageData | null>(null)
const sending = ref(false)
const status = ref<string | null>(null)
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
    if (!response.ok) {
      urlError.value = `Erreur HTTP ${response.status}`
      return
    }

    const contentType = response.headers.get('content-type') || ''
    if (!contentType.startsWith('image/')) {
      urlError.value = "L'URL ne pointe pas vers une image"
      return
    }

    const buffer = await response.arrayBuffer()
    if (buffer.byteLength > MAX_FILE_SIZE) {
      const maxMb = MAX_FILE_SIZE / (1024 * 1024)
      const actualMb = buffer.byteLength / (1024 * 1024)

      urlError.value = `L'image est trop volumineuse : ${actualMb.toFixed(2)} MB (maximum : ${maxMb.toFixed(0)} MB).`
      return
    }

    const blob = new Blob([buffer])
    const objectUrl = URL.createObjectURL(blob)

    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(objectUrl)

      if (
        img.naturalWidth > MAX_IMAGE_DIMENSION ||
        img.naturalHeight > MAX_IMAGE_DIMENSION
      ) {
        urlError.value = `L'image dépasse les dimensions maximales de ${MAX_IMAGE_DIMENSION}x${MAX_IMAGE_DIMENSION}px`
        urlLoading.value = false
        return
      }

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
    urlError.value =
      e instanceof Error ? e.message : "Erreur lors du chargement de l'image"
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
              :disabled="urlLoading || !imageUrl.trim()">
            {{ urlLoading ? 'Chargement...' : 'Charger' }}
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
        {{ sending ? 'Envoi...' : 'Envoyer au Pixoo-64' }}
      </button>

      <p v-if="status" :class="status.includes('Erreur') ? 'error' : 'success'">
        {{ status }}
      </p>

      <p v-if="!deviceStore.connected" class="hint">
        Connectez-vous d'abord à un appareil.
      </p>
    </div>
  </div>
</template>

<style scoped>
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
