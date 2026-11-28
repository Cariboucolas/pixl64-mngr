<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import Grid3x3Icon from '../../assets/icons/grid-3x3.svg?component'
import Grid5x5Icon from '../../assets/icons/grid-5x5.svg?component'
import type { Sequence } from '../../services/divoom/sequence'
import LibraryItemCard, {
  type CardState,
} from '../molecules/LibraryItemCard.vue'

export interface LibraryGridItem {
  id: string
  label?: string
  sequence: Sequence | null
  animated: boolean
  state: CardState
  errorMessage?: string
}

const { t } = useI18n()

/** Width of one device pixel in a thumbnail, in CSS pixels. */
const LARGE_CELL = 3
const SMALL_CELL = 2

defineProps<{
  items: LibraryGridItem[]
  /** Shown when there is no item: the library is empty, or the search found nothing. */
  emptyMessage: string | null
}>()

defineEmits<{
  send: [id: string]
  remove: [id: string]
  preview: [id: string]
}>()

const query = defineModel<string>('query', { required: true })
const cell = defineModel<number>('cell', { default: LARGE_CELL })
</script>

<template>
  <div class="library-grid">
    <div class="toolbar">
      <input
        v-model="query"
        type="text"
        :aria-label="t('library.searchPlaceholder')"
        :placeholder="t('library.searchPlaceholder')"
      />
      <div class="size-toggle">
        <button
          type="button"
          :class="{ active: cell === LARGE_CELL }"
          :aria-pressed="cell === LARGE_CELL"
          :aria-label="t('library.largeAria')"
          :title="t('library.largeAria')"
          @click="cell = LARGE_CELL"
        >
          <Grid3x3Icon />
        </button>
        <button
          type="button"
          :class="{ active: cell === SMALL_CELL }"
          :aria-pressed="cell === SMALL_CELL"
          :aria-label="t('library.smallAria')"
          :title="t('library.smallAria')"
          @click="cell = SMALL_CELL"
        >
          <Grid5x5Icon />
        </button>
      </div>
    </div>

    <p v-if="emptyMessage" class="hint">{{ emptyMessage }}</p>
    <div v-else class="items">
      <LibraryItemCard
        v-for="item in items"
        :id="item.id"
        :key="item.id"
        :label="item.label"
        :sequence="item.sequence"
        :animated="item.animated"
        :cell="cell"
        :state="item.state"
        :error-message="item.errorMessage"
        @send="$emit('send', $event)"
        @remove="$emit('remove', $event)"
        @preview="$emit('preview', $event)"
      />
    </div>
  </div>
</template>

<style scoped>
.library-grid {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.toolbar {
  display: flex;
  gap: var(--space-3);
}

.toolbar input {
  flex: 1;
  min-width: 0;
}

.size-toggle {
  display: flex;
  gap: var(--space-1);
}

.size-toggle button {
  display: grid;
  place-items: center;
  padding: var(--space-2);
  color: var(--color-text-secondary);
}

.size-toggle button svg {
  width: 18px;
  height: 18px;
}

.size-toggle button.active {
  color: var(--color-accent);
  border-color: var(--color-accent);
}

.items {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4);
}
</style>
