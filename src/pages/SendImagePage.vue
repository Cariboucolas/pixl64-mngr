<script setup lang="ts">
import { ref } from 'vue'
import { useDeviceStore } from '../stores/device'
import { resizeToCanvas, sendStaticImage } from '../services/divoom/image'
import ImageUploader from '../components/image/ImageUploader.vue'
import ImagePreview from '../components/image/ImagePreview.vue'

const deviceStore = useDeviceStore()
const imageData = ref<ImageData | null>(null)
const sending = ref(false)
const status = ref<string | null>(null)

function onImageLoaded(img: HTMLImageElement) {
  imageData.value = resizeToCanvas(img, 64)
  status.value = null
}

async function sendToDevice() {
  const client = deviceStore.getClient()
  if (!client || !imageData.value) return

  sending.value = true
  status.value = null

  try {
    await sendStaticImage(client, imageData.value)
    status.value = 'Image envoyée !'
  } catch (e) {
    status.value = e instanceof Error ? e.message : 'Erreur lors de l\'envoi'
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

      <ImagePreview :image-data="imageData" />

      <button
        class="primary"
        :disabled="!imageData || !deviceStore.isReady || sending"
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
.send-layout {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  align-items: flex-start;
  max-width: 300px;
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
