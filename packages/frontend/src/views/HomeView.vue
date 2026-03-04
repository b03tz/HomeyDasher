<script setup lang="ts">
import { ref, computed, onUnmounted } from "vue";
import { useDeviceStore } from "../stores/devices";
import { useZoneStore } from "../stores/zones";
import { useSocket } from "../composables/useSocket";
import DeviceList from "../components/DeviceList.vue";

const deviceStore = useDeviceStore();
const zoneStore = useZoneStore();
const { socket } = useSocket();
const connected = ref(socket.connected);
const onConnect = () => { connected.value = true; };
const onDisconnect = () => { connected.value = false; };
socket.on("connect", onConnect);
socket.on("disconnect", onDisconnect);
onUnmounted(() => {
  socket.off("connect", onConnect);
  socket.off("disconnect", onDisconnect);
});

const zonesWithDevices = computed(() =>
  zoneStore.sortedZones
    .filter((zone) => deviceStore.devicesByZone[zone.id]?.length)
    .map((zone) => ({
      ...zone,
      devices: deviceStore.devicesByZone[zone.id],
    }))
);
</script>

<template>
  <div class="home">
    <header class="app-header">
      <h1>HomeControl</h1>
      <span class="status-dot" :class="{ online: connected }" :title="connected ? 'Connected' : 'Disconnected'" />
    </header>

    <main class="content">
      <p v-if="!zonesWithDevices.length" class="empty">
        Waiting for devices...
      </p>
      <DeviceList
        v-for="zone in zonesWithDevices"
        :key="zone.id"
        :zone-name="zone.name"
        :devices="zone.devices"
      />
    </main>
  </div>
</template>

<style scoped>
.home {
  max-width: 1200px;
  margin: 0 auto;
  padding: 16px;
}

.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border);
}

.app-header h1 {
  font-size: 1.5rem;
  font-weight: 700;
}

.status-dot {
  width: 12px;
  height: 12px;
  margin-left: 8px;
  border-radius: 50%;
  background: var(--danger);
  box-shadow: 0 0 6px 2px var(--danger);
  transition: background 0.3s, box-shadow 0.3s;
  flex-shrink: 0;
}

.status-dot.online {
  background: var(--success);
  box-shadow: 0 0 6px 2px var(--success);
}

.empty {
  text-align: center;
  color: var(--text-secondary);
  padding: 48px 0;
  font-size: 1.1rem;
}

.content {
  padding-bottom: 32px;
}
</style>
