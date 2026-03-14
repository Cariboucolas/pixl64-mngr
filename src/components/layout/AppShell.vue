<script setup lang="ts">
</script>

<template>
  <div class="app-shell">
    <SideNav />
    <div class="app-content">
      <RouterView />
      <StatusBar />
    </div>
  </div>
</template>

<style scoped>
.app-shell {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

.app-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}
</style>
