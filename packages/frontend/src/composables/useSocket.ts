import { ref } from "vue";
import { io, Socket } from "socket.io-client";
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  HomeyConnectionStatus,
} from "@homecontrol/shared";
import { useDeviceStore } from "../stores/devices";
import { useZoneStore } from "../stores/zones";

let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

const homeyStatus = ref<HomeyConnectionStatus>("disconnected");

export function useSocket() {
  if (!socket) {
    socket = io({
      transports: ["websocket", "polling"],
    });

    socket.on("state:sync", ({ devices, zones }) => {
      const deviceStore = useDeviceStore();
      const zoneStore = useZoneStore();
      deviceStore.setDevices(devices);
      zoneStore.setZones(zones);
      deviceStore.fetchDeviceOverrides();
    });

    socket.on("capability:updated", (payload) => {
      const deviceStore = useDeviceStore();
      deviceStore.updateCapability(
        payload.deviceId,
        payload.capabilityId,
        payload.value
      );
    });

    socket.on("device:updated", (device) => {
      const deviceStore = useDeviceStore();
      deviceStore.updateDevice(device);
    });

    socket.on("device:added", (device) => {
      const deviceStore = useDeviceStore();
      deviceStore.updateDevice(device);
    });

    socket.on("device:removed", (deviceId) => {
      const deviceStore = useDeviceStore();
      deviceStore.removeDevice(deviceId);
    });

    socket.on("homey:status", (status) => {
      homeyStatus.value = status;
    });
  }

  return { socket, homeyStatus };
}
