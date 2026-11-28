<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const emit = defineEmits<{
  pick: [file: File]
}>()

const fileInput = ref<HTMLInputElement>()

const onFileChange = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return

  emit('pick', file)
  // Picking the same file again must count as a new pick.
  ;(event.target as HTMLInputElement).value = ''
}
</script>

<template>
  <div class="file-picker">
    <button class="primary" @click="fileInput?.click()">
      {{ t('new.chooseFile') }}
    </button>
    <input
      ref="fileInput"
      type="file"
      accept="image/png,image/jpeg,image/gif,image/webp"
      hidden
      @change="onFileChange"
    />
  </div>
</template>

<style scoped>
.file-picker {
  display: flex;
}
</style>
