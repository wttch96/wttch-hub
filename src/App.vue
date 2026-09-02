<script setup lang="ts">
const appName = 'wttch-hub';
const welcome = '💖 Welcome to wttch-hub!';
</script>

<template>
  <main class="app">
    <h1>{{ appName }}</h1>
    <p>{{ welcome }}</p>
    <p class="stack">
      Electron · Vue 3 · Vite (electron-forge)
    </p>
  </main>
</template>

<style scoped>
.app {
  text-align: center;
  padding-top: 4rem;
}

.stack {
  color: #6b7280;
  font-size: 0.85rem;
}
</style>
