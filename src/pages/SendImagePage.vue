<script setup lang="ts">
import { fetch } from '@tauri-apps/plugin-http'
import { ref } from 'vue'
import ImageCropper from '../components/image/ImageCropper.vue'
import ImagePreview from '../components/image/ImagePreview.vue'
import ImageUploader from '../components/image/ImageUploader.vue'
import {
  imageDataToDataUrl,
  sendStaticImage,
  validateImageDimensions,
  validateImageResponse,
  validateImageUrl,
} from '../services/divoom/image'
import { useDeviceStore } from '../stores/device'
import { useFavoritesStore } from '../stores/favorites.ts'

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
    img.onerror = () =>
      reject(new Error("Le fichier n'est pas une image valide"))
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
    const safeUrl = validateImageUrl(rawUrl)
    const response = await fetch(safeUrl.toString())
    const buffer = await validateImageResponse(response)

    blobUrl = URL.createObjectURL(new Blob([buffer]))
    const img = await loadImageFromBlob(blobUrl)
    validateImageDimensions(img)
    onImageLoaded(img)
  } catch (e) {
    urlError.value =
      e instanceof Error ? e.message : "Erreur lors du chargement de l'image"
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
  status.value = 'Ajouté aux favoris !'
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
    status.value = 'Image envoyée !'
    showFavoriteForm.value = true
    favoriteLabel.value = ''
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

      <div v-if="showFavoriteForm" class="favorite-form">
        <p class="success">Image envoyée !</p>
        <label class="favorite-label">
          Nom du favori (optionnel)
          <input
              v-model="favoriteLabel"
              type="text"
              placeholder="Ex: Logo Halo"
          />
        </label>
        <div class="favorite-actions">
          <button class="primary" @click="saveAsFavorite">
            Sauvegarder en favori
          </button>
          <button @click="dismissFavoriteForm">
            Non merci
          </button>
        </div>
      </div>

      <p v-else-if="status" :class="status.includes('Erreur') ? 'error' : 'success'">
        {{ status }}
      </p>

      <p v-if="!deviceStore.connected" class="hint">
        Connectez-vous d'abord à un appareil.
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
