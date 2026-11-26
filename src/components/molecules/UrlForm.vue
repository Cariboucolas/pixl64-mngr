<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

defineProps<{
  loading: boolean
  error: string | null
}>()

defineEmits<{
  submit: []
}>()

const url = defineModel<string>({ required: true })
</script>

<template>
  <div class="url-form">
    <form @submit.prevent="$emit('submit')">
      <input
        v-model="url"
        type="url"
        :aria-label="t('new.urlLabel')"
        :placeholder="t('new.urlPlaceholder')"
        :disabled="loading"
      />
      <button type="submit" :disabled="loading || !url.trim()">
        {{ loading ? t('common.loading') : t('new.load') }}
      </button>
    </form>
    <p v-if="error" class="error" role="alert">{{ error }}</p>
  </div>
</template>

<style scoped>
.url-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  flex: 1;
  min-width: 0;
}

form {
  display: flex;
  gap: var(--space-2);
}

input {
  flex: 1;
  min-width: 0;
}
</style>
