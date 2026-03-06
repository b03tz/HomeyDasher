<script setup lang="ts">
import { useSocket } from "./composables/useSocket";
import DashboardView from "./views/DashboardView.vue";
import ToastContainer from "./components/ToastContainer.vue";

// Initialize the socket connection
useSocket();
</script>

<template>
  <DashboardView />
  <ToastContainer />
</template>

<style>
*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  -webkit-tap-highlight-color: transparent;
}

:root {
  --bg-primary: #060a12;
  --bg-secondary: rgba(12, 20, 40, 0.6);
  --bg-card: rgba(10, 18, 35, 0.55);
  --text-primary: #e8eaf0;
  --text-secondary: #8090b0;
  --accent: #4fc3f7;
  --accent-hover: #29b6f6;
  --success: #66bb6a;
  --danger: #ef5350;
  --border: rgba(79, 195, 247, 0.35);
  --radius: 12px;
  --grid-gap: 12px;
  --touch-min: 48px;
  --card-blur: 18px;
  --card-shadow:
    0 8px 32px rgba(0, 0, 0, 0.4),
    0 0 20px rgba(79, 195, 247, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.1),
    inset 0 0 20px rgba(79, 195, 247, 0.03);
  --glow-accent: rgba(79, 195, 247, 0.4);
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background:
    radial-gradient(ellipse 80% 50% at 5% 5%, rgba(16, 29, 55, 0.9) 0%, transparent 55%),
    radial-gradient(ellipse 60% 45% at 95% 90%, rgba(16, 29, 55, 0.7) 0%, transparent 50%),
    radial-gradient(ellipse 40% 35% at 50% 35%, rgba(16, 29, 55, 0.5) 0%, transparent 45%),
    radial-gradient(circle at 20% 70%, rgba(79, 195, 247, 0.12) 0%, transparent 30%),
    radial-gradient(circle at 80% 15%, rgba(56, 150, 220, 0.1) 0%, transparent 25%),
    radial-gradient(circle at 50% 95%, rgba(120, 70, 200, 0.14) 0%, transparent 35%),
    linear-gradient(155deg, #020408 0%, #081428 20%, #101d37 45%, #0a1530 70%, #030610 100%);
  background-attachment: fixed;
  color: var(--text-primary);
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
}

#app {
  min-height: 100vh;
}
</style>
