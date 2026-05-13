<script setup lang="ts">
import {computed, onMounted, ref} from "vue";
import {type Favorite, useFavoritesStore} from "../stores/favorites.ts";
import {useDeviceStore} from "../stores/device.ts";
import {dataUrlToImageData, sendStaticImage} from "../services/divoom/image.ts";
import FavoriteCard from "../components/favorites/FavoriteCard.vue";
import Grid3x3Icon from '../assets/icons/grid-3x3.svg?component'
import Grid5x5Icon from '../assets/icons/grid-5x5.svg?component'


const favoritesStore = useFavoritesStore();
const deviceStore = useDeviceStore()
const query = ref('')
const sending = ref(false)
const status = ref<string | null>(null)
const filteredItems = computed( () => query.value ? favoritesStore.search(query.value) : favoritesStore.items)
const removeFavorite = async (id: string) => {
  await favoritesStore.remove(id)
}
const sendToDevice = async (fav: Favorite) => {
  const client = deviceStore.getClient()
  if (!client) return

  sending.value = true
  status.value = null

  try {
    const imageData = await dataUrlToImageData(fav.dataUrl)
    await sendStaticImage(client, imageData)
    status.value = "Image envoyée !"
  } catch (e) {
    status.value = e instanceof Error ? e.message : "Erreur lors de l'envoi"
  } finally {
    sending.value = false
  }
}
const columns = ref(3)

onMounted(() => {
  favoritesStore.hydrate()
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
    <p v-if="status" :class="status.includes('Erreur') ? 'error' : 'success'">
      {{ status }}
    </p>
    <div class="favorites-grid" :style="{ 'grid-template-columns': `repeat(${columns}, 1fr)` }">
      <FavoriteCard
          v-for="fav in filteredItems"
          :key="fav.id"
          :favorite="fav"
          :sending="sending"
          @send="sendToDevice"
          @remove="removeFavorite"
      />
    </div>
    <p v-if="favoritesStore.loaded && !filteredItems.length">
      {{ query ? 'Aucun résultat' : 'Aucun favori' }}
    </p>
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
