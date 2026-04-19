<script setup lang="ts">
import { ref } from 'vue'
import ImageCropper from '../components/image/ImageCropper.vue'
import ImagePreview from '../components/image/ImagePreview.vue'
import ImageUploader from '../components/image/ImageUploader.vue'
import { sendStaticImage } from '../services/divoom/image'
import { useDeviceStore } from '../stores/device'

const deviceStore = useDeviceStore()
const sourceImage = ref<HTMLImageElement | null>(null)
const croppedData = ref<ImageData | null>(null)
const sending = ref(false)
const status = ref<string | null>(null)

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

      <div class="cropper-preview">
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
