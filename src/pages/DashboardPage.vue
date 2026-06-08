<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useDeviceStore } from '../stores/device'

const { t } = useI18n()
const router = useRouter()
const deviceStore = useDeviceStore()
</script>

<template>
  <div class="page">
    <h1>{{ t('dashboard.title') }}</h1>

    <div class="status-card connected">
      <span class="dot"></span>
      <span>
        {{ t('dashboard.statusLine', { ip: deviceStore.ip, brightness: deviceStore.brightness }) }}
      </span>
    </div>
    <button class="primary" @click="router.push('/connect')">
      {{ t('dashboard.changeDevice') }}
    </button>
  </div>
</template>

<style scoped>
.status-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  border-radius: var(--radius);
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  margin-bottom: 1.5rem;
}

.status-card.connected {
  border-color: var(--color-success);
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.connected .dot {
  background-color: var(--color-success);
}
</style>
