<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

defineEmits<{
  save: []
  dismiss: []
}>()

const label = defineModel<string>({ required: true })
</script>

<template>
  <form class="save-form" @submit.prevent="$emit('save')">
    <label for="item-label">{{ t('new.labelTitle') }}</label>
    <input
      id="item-label"
      v-model="label"
      type="text"
      :placeholder="t('new.labelPlaceholder')"
    />
    <div class="actions">
      <button class="primary" type="submit">{{ t('new.save') }}</button>
      <button type="button" @click="$emit('dismiss')">
        {{ t('new.noThanks') }}
      </button>
    </div>
  </form>
</template>

<style scoped>
.save-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  max-width: 320px;
}

label {
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
}

.actions {
  display: flex;
  gap: var(--space-2);
}
</style>
