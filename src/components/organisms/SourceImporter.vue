<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import FilePicker from '../molecules/FilePicker.vue'
import UrlForm from '../molecules/UrlForm.vue'

const { t } = useI18n()

defineProps<{
  urlLoading: boolean
  urlError: string | null
}>()

defineEmits<{
  file: [file: File]
  url: []
}>()

const url = defineModel<string>('url', { required: true })
</script>

<template>
  <div class="source-importer">
    <FilePicker @pick="$emit('file', $event)" />
    <span class="separator">{{ t('new.or') }}</span>
    <UrlForm
      v-model="url"
      :loading="urlLoading"
      :error="urlError"
      @submit="$emit('url')"
    />
  </div>
</template>

<style scoped>
.source-importer {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
}

.separator {
  padding-top: var(--space-2);
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
}
</style>
