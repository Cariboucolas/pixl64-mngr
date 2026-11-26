<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import ConfirmDialog from '../components/molecules/ConfirmDialog.vue'
import type { CardState } from '../components/molecules/LibraryItemCard.vue'
import LibraryGrid, {
  type LibraryGridItem,
} from '../components/organisms/LibraryGrid.vue'
import { deviceErrorMessage } from '../services/divoom/deviceError'
import { dataUrlToImageData } from '../services/divoom/image'
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
const frames = shallowRef<Map<string, ImageData>>(new Map())

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
      label: item.label,
      frame: frames.value.get(item.id) ?? null,
      state: stateOf(item.id),
      errorMessage: errorMessages.value.get(item.id),
    }),
  ),
)

const emptyMessage = computed(() => {
  if (!libraryStore.loaded || visibleItems.value.length) return null
  return query.value ? t('library.noResults') : t('library.empty')
})

/** Decodes the stills that have no frame yet; one that cannot be decoded stays unlit. */
const decodeMissingFrames = async (items: LibraryItem[]) => {
  const missing = items.filter((item) => !frames.value.has(item.id))
  if (!missing.length) return
  const decoded = await Promise.allSettled(
    missing.map((item) => dataUrlToImageData(item.dataUrl)),
  )
  const next = new Map(frames.value)
  decoded.forEach((result, index) => {
    if (result.status === 'fulfilled') next.set(missing[index].id, result.value)
  })
  frames.value = next
}

watch(() => libraryStore.items, decodeMissingFrames, { immediate: true })

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
  await libraryStore.remove(target.id)
}

const send = async (id: string) => {
  const item = libraryStore.items.find((candidate) => candidate.id === id)
  if (!item) return

  sendingId.value = id
  try {
    const frame =
      frames.value.get(id) ?? (await dataUrlToImageData(item.dataUrl))
    await deviceStore.sendStill(frame)
    flashSent(id)
  } catch (e) {
    flashError(id, deviceErrorMessage(e))
  } finally {
    sendingId.value = null
  }
}

onMounted(() => {
  libraryStore.hydrate()
})

onUnmounted(() => {
  timeouts.forEach(clearTimeout)
  timeouts.clear()
})
</script>

<template>
  <LibraryGrid
    v-model:query="query"
    :items="visibleItems"
    :empty-message="emptyMessage"
    @send="send"
    @remove="askRemove"
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
