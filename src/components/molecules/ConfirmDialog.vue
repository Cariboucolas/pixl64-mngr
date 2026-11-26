<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  open: boolean
  title: string
  message?: string
  confirmLabel: string
  cancelLabel: string
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
      <button type="button" @click="emit('cancel')">
        {{ cancelLabel }}
      </button>
      <button
        type="button"
        :class="destructive ? 'danger' : 'primary'"
        @click="emit('confirm')"
      >
        {{ confirmLabel }}
      </button>
    </div>
  </dialog>
</template>

<style scoped>
.confirm-dialog {
  position: fixed;
  inset: 0;
  margin: auto;
  border: 1px solid var(--color-control-border);
  border-radius: var(--radius);
  background: var(--color-panel);
  color: var(--color-text);
  padding: var(--space-5);
  min-width: 320px;
  max-width: 480px;
  width: max-content;
  height: max-content;
}

.confirm-dialog::backdrop {
  background: rgba(0, 0, 0, 0.7);
}

.confirm-dialog__title {
  margin-bottom: var(--space-2);
  color: var(--color-text);
}

.confirm-dialog__message {
  margin-bottom: var(--space-5);
  color: var(--color-text-secondary);
}

.confirm-dialog__actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
}
</style>
