<script setup lang="ts">
import type { Favorite } from "../../stores/favorites.ts";
import TrashIcon from '../../assets/icons/trash.svg?component';
import SendIcon from '../../assets/icons/send.svg?component';

defineProps<{
  favorite: Favorite;
  sending?: boolean;
}>();

defineEmits<{
  send: [fav: Favorite];
  remove: [id: string];
}>();
</script>

<template>
  <article
      class="favorite-card"
      :style="{ backgroundImage: `url(${favorite.dataUrl})` }"
  >
    <div class="favorite-card__overlay">
      <h3 v-if="favorite.label" class="favorite-card__title">{{ favorite.label }}</h3>

      <div class="favorite-card__actions">
        <button
            class="icon-btn icon-btn--send"
            type="button"
            :disabled="sending"
            aria-label="Envoyer au device"
            @click="$emit('send', favorite)"
        >
          <SendIcon />
        </button>

        <button
            class="icon-btn icon-btn--danger"
            type="button"
            aria-label="Supprimer le favori"
            @click="$emit('remove', favorite.id)"
        >
          <TrashIcon />
        </button>
      </div>
    </div>
  </article>
</template>

<style scoped>
.favorite-card {
  position: relative;
  aspect-ratio: 1 / 1;
  border-radius: var(--radius-lg);
  overflow: hidden;
  background-size: contain;
  image-rendering: pixelated;
  background-position: center;
  background-repeat: no-repeat;
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  isolation: isolate;
  cursor: default;
}

.favorite-card__overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 8px;
  background:
    linear-gradient(to bottom, rgba(0, 0, 0, 0.65) 0%, rgba(0, 0, 0, 0.10) 35%),
    linear-gradient(to top,    rgba(0, 0, 0, 0.80) 0%, rgba(0, 0, 0, 0.10) 40%);
}

.favorite-card__title {
  margin: 0;
  color: #fff;
  font-size: 0.75rem;
  font-weight: 700;
  line-height: 1.2;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.favorite-card__actions {
  display: flex;
  gap: 6px;
  justify-content: flex-end;
}

.icon-btn {
  width: auto;
  height: auto;
  border-radius: 0;
  border: none;
  background: none;
  backdrop-filter: none;
  display: grid;
  place-items: center;
  color: rgba(255, 255, 255, 0.85);
  cursor: pointer;
  padding: 2px;
  transition: transform 120ms ease, color 120ms ease, opacity 120ms ease;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.8));
}

.icon-btn svg {
  width: 16px;
  height: 16px;
}

.icon-btn:hover:not(:disabled) {
  transform: translateY(-2px) scale(1.15);
  color: #fff;
}

.icon-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.icon-btn--send svg {
  width: 13px;
  height: 13px;
}

.icon-btn--danger:hover:not(:disabled) {
  color: var(--color-danger);
}
</style>
