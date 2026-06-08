<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const emit = defineEmits<{
  load: [image: HTMLImageElement]
}>()

const fileInput = ref<HTMLInputElement>()

const onFileChange = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return

  const img = new Image()
  img.onload = () => emit('load', img)
  img.src = URL.createObjectURL(file)
}
</script>

<template>
  <div class="image-uploader">
    <button class="primary" @click="fileInput?.click()">
      {{ t('image.choose') }}
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
.image-uploader {
  display: flex;
}
</style>
