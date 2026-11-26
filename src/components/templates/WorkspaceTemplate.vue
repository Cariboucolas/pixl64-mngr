<template>
  <div class="workspace">
    <slot name="panel" />
    <div class="main">
      <slot name="tabs" />
      <main class="content">
        <slot />
      </main>
    </div>
  </div>
</template>

<style scoped>
.workspace {
  display: flex;
  height: 100%;
  overflow: hidden;
}

.main {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.content {
  flex: 1;
  padding: var(--space-5);
  overflow-y: auto;
}
</style>
