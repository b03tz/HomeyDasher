import type { HomeyDevice } from "./device.js";
import type { HomeyZone } from "./zone.js";

export type HomeyConnectionStatus = "connected" | "reconnecting" | "disconnected";

export interface ServerToClientEvents {
  "state:sync": (payload: {
    devices: Record<string, HomeyDevice>;
    zones: Record<string, HomeyZone>;
  }) => void;
  "device:updated": (device: HomeyDevice) => void;
  "device:added": (device: HomeyDevice) => void;
  "device:removed": (deviceId: string) => void;
  "capability:updated": (payload: {
    deviceId: string;
    capabilityId: string;
    value: unknown;
  }) => void;
  "homey:status": (status: HomeyConnectionStatus) => void;
  "livechart:history": (payload: {
    deviceId: string;
    capabilityId: string;
    points: { t: number; v: number }[];
  }) => void;
}

export interface ClientToServerEvents {
  "state:request": () => void;
  "livechart:request-history": (payload: {
    deviceId: string;
    capabilityId: string;
    periodMs: number;
  }) => void;
}
