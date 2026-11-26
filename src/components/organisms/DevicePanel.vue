<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import PixelGrid from '../atoms/PixelGrid.vue'
import StatusDot from '../atoms/StatusDot.vue'
import BrightnessSlider from '../molecules/BrightnessSlider.vue'
import ChannelSelector from '../molecules/ChannelSelector.vue'
import LocaleToggle from '../molecules/LocaleToggle.vue'
import PowerToggle from '../molecules/PowerToggle.vue'

const { t } = useI18n()

/** Device pixels are drawn 3 CSS pixels wide: 192 px, inside the panel width. */
const PREVIEW_CELL = 3

defineProps<{
  frame: ImageData | null
  deviceName: string | null
  ip: string
  connected: boolean
  brightness: number
  screenOn: boolean
  channel: number
  error: string | null
  locale: string
}>()

defineEmits<{
  brightness: [value: number]
  channel: [value: number]
  togglePower: []
  changeDevice: []
  toggleLocale: []
}>()
</script>

<template>
  <aside class="device-panel" :aria-label="t('panel.title')">
    <PixelGrid :frame="frame" :cell="PREVIEW_CELL" :label="t('panel.preview')" />
    <p v-if="!frame" class="hint">{{ t('panel.noFrame') }}</p>

    <div class="identity">
      <StatusDot :on="connected" />
      <div>
        <p class="name">{{ deviceName ?? t('panel.unnamedDevice') }}</p>
        <p class="ip">{{ ip }}</p>
      </div>
    </div>

    <div class="settings">
      <BrightnessSlider
        :model-value="brightness"
        :disabled="!connected"
        @update:model-value="$emit('brightness', $event)"
      />
      <PowerToggle
        :on="screenOn"
        :disabled="!connected"
        @toggle="$emit('togglePower')"
      />
      <ChannelSelector
        :model-value="channel"
        :disabled="!connected"
        @update:model-value="$emit('channel', $event)"
      />
      <p v-if="error" class="error" role="alert">{{ error }}</p>
    </div>

    <footer>
      <button type="button" @click="$emit('changeDevice')">
        {{ t('panel.changeDevice') }}
      </button>
      <LocaleToggle
        :locale="locale"
        :label="t('panel.changeLanguage')"
        @toggle="$emit('toggleLocale')"
      />
    </footer>
  </aside>
</template>

<style scoped>
.device-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  width: var(--panel-width);
  flex-shrink: 0;
  padding: var(--space-4);
  background-color: var(--color-panel);
  border-right: 1px solid var(--color-rule);
  overflow-y: auto;
}

.identity {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.name {
  font-weight: 700;
}

.ip {
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
}

.settings {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding-top: var(--space-4);
  border-top: 1px solid var(--color-rule);
}

footer {
  display: flex;
  justify-content: space-between;
  gap: var(--space-2);
  margin-top: auto;
  padding-top: var(--space-4);
  border-top: 1px solid var(--color-rule);
}

footer button {
  font-size: var(--text-sm);
}
</style>
