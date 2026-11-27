<script setup lang="ts">
import { useId } from 'vue'

export interface SettingOption {
  value: number
  label: string
}

defineProps<{
  label: string
  modelValue: number
  options: SettingOption[]
  disabled: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

const id = useId()

const onChange = (event: Event) => {
  emit('update:modelValue', Number((event.target as HTMLSelectElement).value))
}
</script>

<template>
  <div class="select-setting">
    <label :for="id">{{ label }}</label>
    <select :id="id" :value="modelValue" :disabled="disabled" @change="onChange">
      <option v-for="option in options" :key="option.value" :value="option.value">
        {{ option.label }}
      </option>
    </select>
  </div>
</template>

<style scoped>
.select-setting {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

label {
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
}

select {
  width: 100%;
}
</style>
