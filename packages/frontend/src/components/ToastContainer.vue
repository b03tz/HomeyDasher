<script setup lang="ts">
import { useToast } from "../composables/useToast";

const { toasts } = useToast();
</script>

<template>
  <Teleport to="body">
    <div class="toast-stack">
      <TransitionGroup name="toast">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="toast-item"
          :class="toast.type"
        >
          {{ toast.message }}
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-stack {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  pointer-events: none;
}

.toast-item {
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 500;
  color: #fff;
  background: rgba(15, 25, 45, 0.8);
  border: 1px solid rgba(79, 195, 247, 0.15);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(79, 195, 247, 0.05);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  pointer-events: auto;
  max-width: 400px;
  text-align: center;
}

.toast-item.success {
  border-color: var(--success);
  background: color-mix(in srgb, var(--success) 20%, var(--bg-card));
}

.toast-item.warning {
  border-color: #ffb74d;
  background: color-mix(in srgb, #ffb74d 20%, var(--bg-card));
}

.toast-item.error {
  border-color: var(--danger);
  background: color-mix(in srgb, var(--danger) 20%, var(--bg-card));
}

.toast-item.info {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 20%, var(--bg-card));
}

.toast-enter-active {
  transition: all 0.3s ease;
}

.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.toast-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
