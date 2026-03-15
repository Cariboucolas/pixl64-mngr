<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useDeviceStore } from '../../stores/device.ts'

const deviceStore = useDeviceStore()
const router = useRouter()
const onDisconnect = () => {
  deviceStore.disconnect()
  router.push('/connect')
}
</script>

<template>
  <nav class="side-nav">
    <div class="side-nav-top">
      <div class="side-nav-header">
        <h2>Pixl64</h2>
      </div>
      <ul class="side-nav-links">
        <li>
          <RouterLink to="/" exact-active-class="active">Dashboard</RouterLink>
        </li>
        <li>
          <RouterLink to="/controls" active-class="active">Contrôles</RouterLink>
        </li>
        <li>
          <RouterLink to="/send" active-class="active">Envoyer image</RouterLink>
        </li>
      </ul>
      </div>
    <ul class="side-nav-footer">
      <li>
        <button class="primary" @click="onDisconnect">Déconnecter</button>
      </li>
    </ul>
  </nav>
</template>

<style scoped>
.side-nav {
  width: 200px;
  background-color: var(--color-sidebar-bg);
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  flex-shrink: 0;
}

.side-nav-header {
  padding: 1rem;
  border-bottom: 1px solid var(--color-border);
}

.side-nav-header h2 {
  margin: 0;
  font-size: 1.2rem;
  color: var(--color-text);
}

.side-nav-footer {
  list-style: none;
  display: flex;
  justify-content: center;
  padding: 1rem;
}

.side-nav-links {
  list-style: none;
  padding: 0;
  margin: 0;
}

.side-nav-links li a {
  display: block;
  padding: 0.75rem 1rem;
  color: var(--color-text-secondary);
  text-decoration: none;
  transition: background-color 0.15s, color 0.15s;
}

.side-nav-links li a:hover {
  background-color: var(--color-hover);
  color: var(--color-text);
}

.side-nav-links li a.active {
  background-color: var(--color-active);
  color: var(--color-primary);
  font-weight: 600;
}
</style>
