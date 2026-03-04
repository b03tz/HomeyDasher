import type { Server } from "socket.io";
import type {
  ServerToClientEvents,
  ClientToServerEvents,
} from "@homecontrol/shared";
import type { HomeyService } from "../services/HomeyService.js";

export function setupSocketHandler(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  homey: HomeyService
) {
  // Forward HomeyService events to all connected clients
  homey.on("capability:updated", (payload) => {
    io.emit("capability:updated", payload);
  });

  homey.on("device:updated", (device) => {
    io.emit("device:updated", device);
  });

  homey.on("device:added", (device) => {
    io.emit("device:added", device);
  });

  homey.on("device:removed", (deviceId) => {
    io.emit("device:removed", deviceId);
  });

  // Forward Homey connection status
  homey.on("homey:status", (status) => {
    io.emit("homey:status", status);
  });

  // After reconnect, push full state to all clients
  homey.on("state:resync", () => {
    io.emit("state:sync", {
      devices: homey.getDevices(),
      zones: homey.getZones(),
    });
  });

  // Handle new client connections
  io.on("connection", (socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Send full state on connect
    socket.emit("state:sync", {
      devices: homey.getDevices(),
      zones: homey.getZones(),
    });

    // Send current Homey connection status
    socket.emit("homey:status", homey.status);

    socket.on("state:request", () => {
      socket.emit("state:sync", {
        devices: homey.getDevices(),
        zones: homey.getZones(),
      });
    });

    socket.on("disconnect", () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });
}
