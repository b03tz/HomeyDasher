import type { DeviceCapability } from "./capability.js";

export interface HomeyDevice {
  id: string;
  name: string;
  zoneName: string;
  zoneId: string;
  class: string;
  iconUrl: string | null;
  available: boolean;
  capabilities: Record<string, DeviceCapability>;
}
