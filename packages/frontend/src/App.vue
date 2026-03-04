<script setup lang="ts">
import { useSocket } from "./composables/useSocket";
import DashboardView from "./views/DashboardView.vue";

// Initialize the socket connection
useSocket();
</script>

<template>
  <DashboardView />
</template>

<style>
*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

:root {
  --bg-primary: #1a1a2e;
  --bg-secondary: #16213e;
  --bg-card: #1f2b47;
  --text-primary: #e0e0e0;
  --text-secondary: #a0a0b0;
  --accent: #4fc3f7;
  --accent-hover: #29b6f6;
  --success: #66bb6a;
  --danger: #ef5350;
  --border: #2a3a5c;
  --radius: 12px;
  --grid-gap: 12px;
  --touch-min: 48px;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background: var(--bg-primary);
  color: var(--text-primary);
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
}

#app {
  min-height: 100vh;
}
</style>
