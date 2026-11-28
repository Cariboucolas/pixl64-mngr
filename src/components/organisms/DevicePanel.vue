<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Sequence } from '../../services/divoom/sequence'
import {
  ROTATION_ANGLES,
  type RotationAngle,
  type WhiteBalance,
} from '../../services/divoom/types'
import StatusDot from '../atoms/StatusDot.vue'
import AnimatedPixelGrid from '../molecules/AnimatedPixelGrid.vue'
import LocaleToggle from '../molecules/LocaleToggle.vue'
import RangeSetting from '../molecules/RangeSetting.vue'
import SelectSetting from '../molecules/SelectSetting.vue'
import ToggleSetting from '../molecules/ToggleSetting.vue'

const { t } = useI18n()

/** Channel index on the device → name in the locale files (GLOSSARY: Canal). */
const CHANNELS = ['faces', 'cloud', 'visualizer', 'custom', 'blackScreen']
const HOURS_24 = 1
const HOURS_12 = 0

/** Device pixels are drawn 3 CSS pixels wide: 192 px, inside the panel width. */
const PREVIEW_CELL = 3

const props = defineProps<{
  /** The last sequence sent from this application. */
  shown: Sequence | null
  deviceName: string | null
  ip: string
  /** The device stopped answering: its settings cannot be changed until it is back. */
  lost: boolean
  brightness: number
  screenOn: boolean
  channel: number
  rotation: RotationAngle
  mirrored: boolean
  time24: boolean
  whiteBalance: WhiteBalance
  error: string | null
  /** Changes when a setting was refused: the controls go back to the values above. */
  revision: number
  locale: string
}>()

const emit = defineEmits<{
  brightness: [value: number]
  channel: [value: number]
  togglePower: []
  rotation: [value: RotationAngle]
  toggleMirror: []
  time24: [value: boolean]
  whiteBalance: [value: WhiteBalance]
  reconnect: []
  changeDevice: []
  toggleLocale: []
}>()

const channelOptions = computed(() =>
  CHANNELS.map((name, value) => ({ value, label: t(`channel.${name}`) })),
)

const rotationOptions = computed(() =>
  ROTATION_ANGLES.map((angle) => ({
    value: angle,
    label: t('panel.rotationAngle', { angle }),
  })),
)

const timeFormatOptions = computed(() => [
  { value: HOURS_24, label: t('panel.hours24') },
  { value: HOURS_12, label: t('panel.hours12') },
])

const whiteBalanceChannels = computed(
  (): { key: keyof WhiteBalance; label: string }[] => [
    { key: 'r', label: t('panel.red') },
    { key: 'g', label: t('panel.green') },
    { key: 'b', label: t('panel.blue') },
  ],
)

const setWhiteBalanceChannel = (key: keyof WhiteBalance, value: number) => {
  emit('whiteBalance', { ...props.whiteBalance, [key]: value })
}
</script>

<template>
  <aside class="device-panel" :aria-label="t('panel.title')">
    <AnimatedPixelGrid
      :sequence="shown"
      :cell="PREVIEW_CELL"
      :label="t('panel.preview')"
    />
    <p v-if="!shown" class="hint">{{ t('panel.noFrame') }}</p>

    <div class="identity">
      <StatusDot :on="!lost" />
      <div>
        <p class="name">{{ deviceName ?? t('panel.unnamedDevice') }}</p>
        <p class="ip">{{ ip }}</p>
      </div>
    </div>

    <div v-if="lost" class="lost" role="alert">
      <p>{{ t('panel.lost') }}</p>
      <button type="button" @click="$emit('reconnect')">
        {{ t('panel.reconnect') }}
      </button>
    </div>

    <div :key="revision" class="settings">
      <RangeSetting
        :label="t('panel.brightness')"
        :model-value="brightness"
        :disabled="lost"
        @update:model-value="$emit('brightness', $event)"
      />
      <ToggleSetting
        :label="t('panel.screen')"
        :on="screenOn"
        :on-label="t('panel.screenOn')"
        :off-label="t('panel.screenOff')"
        :disabled="lost"
        @toggle="$emit('togglePower')"
      />
      <SelectSetting
        :label="t('panel.channel')"
        :model-value="channel"
        :options="channelOptions"
        :disabled="lost"
        @update:model-value="$emit('channel', $event)"
      />
      <p v-if="error" class="error" role="alert">{{ error }}</p>
    </div>

    <details class="display">
      <summary>{{ t('panel.display') }}</summary>
      <div :key="revision" class="display-settings">
        <p class="hint">{{ t('panel.displayHint') }}</p>
        <SelectSetting
          :label="t('panel.rotation')"
          :model-value="rotation"
          :options="rotationOptions"
          :disabled="lost"
          @update:model-value="$emit('rotation', $event as RotationAngle)"
        />
        <ToggleSetting
          :label="t('panel.mirror')"
          :on="mirrored"
          :on-label="t('panel.mirrorOn')"
          :off-label="t('panel.mirrorOff')"
          :disabled="lost"
          @toggle="$emit('toggleMirror')"
        />
        <SelectSetting
          :label="t('panel.timeFormat')"
          :model-value="time24 ? HOURS_24 : HOURS_12"
          :options="timeFormatOptions"
          :disabled="lost"
          @update:model-value="$emit('time24', $event === HOURS_24)"
        />
        <fieldset :disabled="lost">
          <legend>{{ t('panel.whiteBalance') }}</legend>
          <RangeSetting
            v-for="colour in whiteBalanceChannels"
            :key="colour.key"
            :label="colour.label"
            :model-value="whiteBalance[colour.key]"
            :disabled="lost"
            @update:model-value="setWhiteBalanceChannel(colour.key, $event)"
          />
          <p class="hint">{{ t('panel.whiteBalanceHint') }}</p>
        </fieldset>
      </div>
    </details>

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

.lost {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  color: var(--color-danger);
  font-size: var(--text-sm);
}

.display {
  padding-top: var(--space-4);
  border-top: 1px solid var(--color-rule);
}

.display summary {
  cursor: pointer;
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
}

.display-settings {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding-top: var(--space-4);
}

fieldset {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  min-width: 0;
  padding: 0;
  border: 0;
}

legend {
  padding: 0;
  margin-bottom: var(--space-2);
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
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
