<script lang="ts">
export type CardState = 'idle' | 'sending' | 'sent' | 'error' | 'disabled'
</script>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AlertIcon from '../../assets/icons/alert.svg?component'
import CheckIcon from '../../assets/icons/check.svg?component'
import LoaderIcon from '../../assets/icons/loader.svg?component'
import SendIcon from '../../assets/icons/send.svg?component'
import TrashIcon from '../../assets/icons/trash.svg?component'
import PixelGrid from '../atoms/PixelGrid.vue'

const { t } = useI18n()

defineProps<{
  id: string
  label?: string
  /** The decoded still; null while it is being decoded. */
  frame: ImageData | null
  /** Width of one device pixel on screen, in CSS pixels. */
  cell: number
  state: CardState
  errorMessage?: string
}>()

defineEmits<{
  send: [id: string]
  remove: [id: string]
}>()
</script>

<template>
  <article class="library-item">
    <PixelGrid
      :frame="frame"
      :cell="cell"
      :label="label ?? t('library.unlabelled')"
    />
    <div class="footer">
      <h3 class="label" :title="label">{{ label ?? t('library.unlabelled') }}</h3>
      <div class="actions">
        <button
          class="icon-btn"
          :class="state"
          type="button"
          :disabled="state === 'sending' || state === 'disabled'"
          :title="state === 'error' ? errorMessage : t('library.sendAriaLabel')"
          :aria-label="
            state === 'error'
              ? t('library.sendErrorAriaLabel', { message: errorMessage ?? '' })
              : t('library.sendAriaLabel')
          "
          @click="$emit('send', id)"
        >
          <LoaderIcon v-if="state === 'sending'" />
          <CheckIcon v-else-if="state === 'sent'" />
          <AlertIcon v-else-if="state === 'error'" />
          <SendIcon v-else />
        </button>
        <button
          class="icon-btn remove"
          type="button"
          :title="t('library.removeAriaLabel')"
          :aria-label="t('library.removeAriaLabel')"
          @click="$emit('remove', id)"
        >
          <TrashIcon />
        </button>
      </div>
    </div>
  </article>
</template>

<style scoped>
.library-item {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  width: min-content;
}

.footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  /* The thumbnail sets the width of the card, never the label. */
  width: 0;
  min-width: 100%;
}

.label {
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  text-transform: none;
  letter-spacing: 0;
  font-weight: 400;
}

.actions {
  display: flex;
  gap: var(--space-1);
}

.icon-btn {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border-color: transparent;
  color: var(--color-text-secondary);
}

.icon-btn svg {
  width: 15px;
  height: 15px;
}

.icon-btn:hover:not(:disabled) {
  color: var(--color-accent);
  border-color: var(--color-accent);
}

.icon-btn.remove:hover {
  color: var(--color-danger);
  border-color: var(--color-danger);
}

.icon-btn.sending {
  opacity: 1;
  color: var(--color-accent);
}

.icon-btn.sending svg {
  animation: spin 0.9s linear infinite;
}

.icon-btn.sent {
  color: var(--color-success);
}

.icon-btn.error {
  color: var(--color-danger);
}

@media (prefers-reduced-motion: reduce) {
  .icon-btn.sending svg {
    animation: none;
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
