<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  open: boolean
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
}>()

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

const dialogRef = ref<HTMLDialogElement>()

watch(
  () => props.open,
  (value) => {
    const dialog = dialogRef.value
    if (!dialog) return
    if (value && !dialog.open) dialog.showModal()
    if (!value && dialog.open) dialog.close()
  },
)

const onDialogClose = () => {
  if (props.open) emit('cancel')
}

const onBackdropClick = (event: MouseEvent) => {
  if (event.target === dialogRef.value) emit('cancel')
}
</script>

<template>
  <dialog
    ref="dialogRef"
    class="confirm-dialog"
    @close="onDialogClose"
    @click="onBackdropClick"
  >
    <h2 class="confirm-dialog__title">{{ title }}</h2>
    <p v-if="message" class="confirm-dialog__message">{{ message }}</p>
    <div class="confirm-dialog__actions">
      <button type="button" class="ghost" @click="emit('cancel')">
        {{ cancelLabel ?? 'Annuler' }}
      </button>
      <button
        type="button"
        :class="destructive ? 'danger' : 'primary'"
        @click="emit('confirm')"
      >
        {{ confirmLabel ?? 'Confirmer' }}
      </button>
    </div>
  </dialog>
</template>

<style scoped>
.confirm-dialog {
  position: fixed;
  inset: 0;
  margin: auto;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg, 12px);
  background: var(--color-surface, #1a1a1a);
  color: var(--color-text, #fff);
  padding: 1.5rem;
  min-width: 320px;
  max-width: 480px;
  width: max-content;
  height: max-content;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);
}

.confirm-dialog::backdrop {
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(2px);
}

.confirm-dialog__title {
  margin: 0 0 0.5rem;
  font-size: 1.05rem;
  font-weight: 600;
}

.confirm-dialog__message {
  margin: 0 0 1.25rem;
  color: var(--color-text-secondary);
  font-size: 0.9rem;
  line-height: 1.4;
}

.confirm-dialog__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.confirm-dialog__actions button {
  padding: 0.5rem 1rem;
  border-radius: var(--radius, 6px);
  font-size: 0.9rem;
  cursor: pointer;
  border: 1px solid transparent;
  transition: background-color 120ms ease, border-color 120ms ease;
}

.confirm-dialog__actions .ghost {
  background: transparent;
  border-color: var(--color-border);
  color: var(--color-text-secondary);
}

.confirm-dialog__actions .ghost:hover {
  background: var(--color-hover);
  color: var(--color-text);
}

.confirm-dialog__actions .danger {
  background: var(--color-danger, #ef4444);
  color: #fff;
}

.confirm-dialog__actions .danger:hover {
  filter: brightness(1.1);
}

.confirm-dialog__actions .primary {
  background: var(--color-primary, #6aa7ff);
  color: #fff;
}

.confirm-dialog__actions .primary:hover {
  filter: brightness(1.1);
}
</style>
