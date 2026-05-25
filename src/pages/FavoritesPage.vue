<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import Grid3x3Icon from '../assets/icons/grid-3x3.svg?component'
import Grid5x5Icon from '../assets/icons/grid-5x5.svg?component'
import ConfirmDialog from '../components/common/ConfirmDialog.vue'
import FavoriteCard, {
  type CardState,
} from '../components/favorites/FavoriteCard.vue'
import {
  dataUrlToImageData,
  sendStaticImage,
} from '../services/divoom/image.ts'
import { useDeviceStore } from '../stores/device.ts'
import { type Favorite, useFavoritesStore } from '../stores/favorites.ts'

const SENT_FLASH_DURATION_MS = 2000
const ERROR_FLASH_DURATION_MS = 5000

const favoritesStore = useFavoritesStore()
const deviceStore = useDeviceStore()
const query = ref('')
const sendingId = ref<string | null>(null)
const sentIds = ref<Set<string>>(new Set())
const errorMessages = ref<Map<string, string>>(new Map())
const pendingDeletion = ref<Favorite | null>(null)
const columns = ref(3)

const timeouts = new Set<ReturnType<typeof setTimeout>>()

const filteredItems = computed(() =>
  query.value ? favoritesStore.search(query.value) : favoritesStore.items,
)

const stateOf = (fav: Favorite): CardState => {
  if (sendingId.value === fav.id) return 'sending'
  if (sentIds.value.has(fav.id)) return 'sent'
  if (errorMessages.value.has(fav.id)) return 'error'
  if (sendingId.value !== null) return 'disabled'
  return 'idle'
}

const scheduleCleanup = (callback: () => void, delay: number) => {
  const timeoutId = setTimeout(() => {
    callback()
    timeouts.delete(timeoutId)
  }, delay)
  timeouts.add(timeoutId)
}

const flashSent = (id: string) => {
  errorMessages.value.delete(id)
  errorMessages.value = new Map(errorMessages.value)

  const next = new Set(sentIds.value)
  next.add(id)
  sentIds.value = next

  scheduleCleanup(() => {
    const cleared = new Set(sentIds.value)
    cleared.delete(id)
    sentIds.value = cleared
  }, SENT_FLASH_DURATION_MS)
}

const flashError = (id: string, message: string) => {
  const next = new Map(errorMessages.value)
  next.set(id, message)
  errorMessages.value = next

  scheduleCleanup(() => {
    const cleared = new Map(errorMessages.value)
    cleared.delete(id)
    errorMessages.value = cleared
  }, ERROR_FLASH_DURATION_MS)
}

const askRemove = (id: string) => {
  const fav = favoritesStore.items.find((f) => f.id === id)
  if (fav) pendingDeletion.value = fav
}

const confirmRemove = async () => {
  const target = pendingDeletion.value
  if (!target) return
  pendingDeletion.value = null
  await favoritesStore.remove(target.id)
}

const cancelRemove = () => {
  pendingDeletion.value = null
}

const sendToDevice = async (fav: Favorite) => {
  const client = deviceStore.getClient()
  if (!client) return

  sendingId.value = fav.id

  try {
    const imageData = await dataUrlToImageData(fav.dataUrl)
    await sendStaticImage(client, imageData)
    flashSent(fav.id)
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur lors de l'envoi"
    flashError(fav.id, message)
  } finally {
    sendingId.value = null
  }
}

onMounted(() => {
  favoritesStore.hydrate()
})

onUnmounted(() => {
  timeouts.forEach(clearTimeout)
  timeouts.clear()
})
</script>

<template>
  <div class="page">
    <h1>Favoris</h1>

    <div class="toolbar">
      <input v-model="query" type="text" placeholder="Rechercher..." />
      <div class="view-toggle">
        <button :class="{ active: columns === 3 }" @click="columns = 3" aria-label="Grille 3 colonnes">
          <Grid3x3Icon />
        </button>
        <button :class="{ active: columns === 5 }" @click="columns = 5" aria-label="Grille 5 colonnes">
          <Grid5x5Icon />
        </button>
      </div>
    </div>
    <div class="favorites-grid" :style="{ 'grid-template-columns': `repeat(${columns}, 1fr)` }">
      <FavoriteCard
          v-for="fav in filteredItems"
          :key="fav.id"
          :favorite="fav"
          :state="stateOf(fav)"
          :error-message="errorMessages.get(fav.id)"
          @send="sendToDevice"
          @remove="askRemove"
      />
    </div>
    <p v-if="favoritesStore.loaded && !filteredItems.length">
      {{ query ? 'Aucun résultat' : 'Aucun favori' }}
    </p>

    <ConfirmDialog
        :open="pendingDeletion !== null"
        title="Supprimer ce favori ?"
        :message="pendingDeletion?.label
          ? `« ${pendingDeletion.label} » sera supprimé définitivement.`
          : 'Ce favori sera supprimé définitivement.'"
        confirm-label="Supprimer"
        cancel-label="Annuler"
        destructive
        @confirm="confirmRemove"
        @cancel="cancelRemove"
    />
  </div>
</template>


<style scoped>
.favorites-grid {
  display: grid;
  gap: 10px;
  padding: 20px;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.toolbar input {
  flex: 1;
}

.view-toggle {
  display: flex;
  gap: 4px;
}

.view-toggle button {
  padding: 6px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  display: grid;
  place-items: center;
}

.view-toggle button svg {
  width: 20px;
  height: 20px;
}

.view-toggle button.active {
  color: var(--color-primary);
  border-color: var(--color-primary);
}
</style>
