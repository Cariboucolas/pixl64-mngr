<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import ConfirmDialog from '../components/molecules/ConfirmDialog.vue'
import type { CardState } from '../components/molecules/LibraryItemCard.vue'
import LibraryGrid, {
  type LibraryGridItem,
} from '../components/organisms/LibraryGrid.vue'
import { type Sequence, still } from '../services/divoom/sequence'
import { libraryErrorMessage } from '../services/library/libraryError'
import { useDeviceStore } from '../stores/device'
import { type LibraryItem, useLibraryStore } from '../stores/library'

const { t } = useI18n()

const SENT_FLASH_DURATION_MS = 2000
const ERROR_FLASH_DURATION_MS = 5000

const libraryStore = useLibraryStore()
const deviceStore = useDeviceStore()
const query = ref('')
const sendingId = ref<string | null>(null)
const sentIds = ref<Set<string>>(new Set())
const errorMessages = ref<Map<string, string>>(new Map())
const pendingDeletion = ref<LibraryItem | null>(null)
/** What each card shows: the first frame, then every frame once an animation was hovered. */
const sequences = shallowRef<Map<string, Sequence>>(new Map())
/** Items whose every frame was read. */
const complete = new Set<string>()

const timeouts = new Set<ReturnType<typeof setTimeout>>()

const stateOf = (id: string): CardState => {
  if (sendingId.value === id) return 'sending'
  if (sentIds.value.has(id)) return 'sent'
  if (errorMessages.value.has(id)) return 'error'
  if (sendingId.value !== null) return 'disabled'
  return 'idle'
}

const visibleItems = computed<LibraryGridItem[]>(() =>
  (query.value ? libraryStore.search(query.value) : libraryStore.items).map(
    (item) => ({
      id: item.id,
      label: item.label ?? undefined,
      sequence: sequences.value.get(item.id) ?? null,
      animated: item.kind === 'animation',
      state: stateOf(item.id),
      errorMessage: errorMessages.value.get(item.id),
    }),
  ),
)

const emptyMessage = computed(() => {
  if (!libraryStore.loaded || visibleItems.value.length) return null
  return query.value ? t('library.noResults') : t('library.empty')
})

const show = (id: string, sequence: Sequence) => {
  sequences.value = new Map(sequences.value).set(id, sequence)
}

/** Reads the first frame of the items that have none yet; one that cannot be read stays unlit. */
const loadMissingThumbnails = async (items: LibraryItem[]) => {
  const missing = items.filter((item) => !sequences.value.has(item.id))
  if (!missing.length) return
  const read = await Promise.allSettled(
    missing.map((item) => libraryStore.thumbnailOf(item.id)),
  )
  const next = new Map(sequences.value)
  read.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      next.set(missing[index].id, still(result.value))
    }
  })
  sequences.value = next
}

/** Every frame of an item, read once. */
const sequenceOf = async (id: string): Promise<Sequence> => {
  const known = sequences.value.get(id)
  if (known && complete.has(id)) return known
  const sequence = await libraryStore.sequenceOf(id)
  complete.add(id)
  show(id, sequence)
  return sequence
}

/** An animation plays under the pointer: its frames are read then. */
const preview = async (id: string) => {
  const item = libraryStore.items.find((candidate) => candidate.id === id)
  if (item?.kind !== 'animation') return
  try {
    await sequenceOf(id)
  } catch {
    // The thumbnail keeps its first frame; sending will report the failure.
  }
}

watch(() => libraryStore.items, loadMissingThumbnails, { immediate: true })

const scheduleCleanup = (callback: () => void, delay: number) => {
  const timeoutId = setTimeout(() => {
    callback()
    timeouts.delete(timeoutId)
  }, delay)
  timeouts.add(timeoutId)
}

const flashSent = (id: string) => {
  const errors = new Map(errorMessages.value)
  errors.delete(id)
  errorMessages.value = errors
  sentIds.value = new Set(sentIds.value).add(id)

  scheduleCleanup(() => {
    const cleared = new Set(sentIds.value)
    cleared.delete(id)
    sentIds.value = cleared
  }, SENT_FLASH_DURATION_MS)
}

const flashError = (id: string, message: string) => {
  errorMessages.value = new Map(errorMessages.value).set(id, message)

  scheduleCleanup(() => {
    const cleared = new Map(errorMessages.value)
    cleared.delete(id)
    errorMessages.value = cleared
  }, ERROR_FLASH_DURATION_MS)
}

const askRemove = (id: string) => {
  pendingDeletion.value =
    libraryStore.items.find((item) => item.id === id) ?? null
}

const confirmRemove = async () => {
  const target = pendingDeletion.value
  if (!target) return
  pendingDeletion.value = null
  try {
    await libraryStore.remove(target.id)
  } catch (e) {
    flashError(target.id, libraryErrorMessage(e))
  }
}

const send = async (id: string) => {
  const item = libraryStore.items.find((candidate) => candidate.id === id)
  if (!item) return

  sendingId.value = id
  try {
    await deviceStore.send(await sequenceOf(id))
    flashSent(id)
  } catch (e) {
    flashError(id, libraryErrorMessage(e))
  } finally {
    sendingId.value = null
  }
}

const loadError = ref<string | null>(null)

const migrationNotice = computed(() => {
  const migration = libraryStore.migration
  if (!migration) return null
  return migration.failed
    ? t('library.migratedWithFailures', { ...migration })
    : t('library.migrated', { ...migration })
})

onMounted(async () => {
  try {
    await libraryStore.hydrate()
  } catch (e) {
    loadError.value = libraryErrorMessage(e)
  }
})

onUnmounted(() => {
  timeouts.forEach(clearTimeout)
  timeouts.clear()
})
</script>

<template>
  <p v-if="migrationNotice" class="notice" role="status">{{ migrationNotice }}</p>
  <p v-if="loadError" class="error" role="alert">{{ loadError }}</p>

  <LibraryGrid
    v-model:query="query"
    :items="visibleItems"
    :empty-message="emptyMessage"
    @send="send"
    @remove="askRemove"
    @preview="preview"
  />

  <ConfirmDialog
    :open="pendingDeletion !== null"
    :title="t('library.deleteConfirmTitle')"
    :message="
      pendingDeletion?.label
        ? t('library.deleteConfirmLabelled', { label: pendingDeletion.label })
        : t('library.deleteConfirmUnlabelled')
    "
    :confirm-label="t('common.delete')"
    :cancel-label="t('common.cancel')"
    destructive
    @confirm="confirmRemove"
    @cancel="pendingDeletion = null"
  />
</template>

<style scoped>
.notice {
  margin-bottom: var(--space-4);
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
}

.error {
  margin-bottom: var(--space-4);
}
</style>
