<script setup lang="ts">
defineProps<{
  on: boolean
  disabled: boolean
}>()

defineEmits<{
  toggle: []
}>()
</script>

<template>
  <div class="power-toggle">
    <label>Écran</label>
    <button
      :class="on ? 'on' : 'off'"
      :disabled="disabled"
      @click="$emit('toggle')"
    >
      {{ on ? 'Allumé' : 'Éteint' }}
    </button>
  </div>
</template>

<style scoped>
.power-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.power-toggle label {
  font-size: 0.875rem;
}

.power-toggle button {
  padding: 0.4rem 1rem;
  border-radius: var(--radius);
  font-weight: 600;
  font-size: 0.8rem;
}

.power-toggle button.on {
  background-color: var(--color-success);
  color: white;
}

.power-toggle button.off {
  background-color: var(--color-danger);
  color: white;
}

.power-toggle button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
