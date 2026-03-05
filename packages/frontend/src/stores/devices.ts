import { defineStore } from "pinia";
import { ref, computed } from "vue";
import type { HomeyDevice } from "@homecontrol/shared";

export const useDeviceStore = defineStore("devices", () => {
  const devices = ref<Record<string, HomeyDevice>>({});
  const deviceOverrides = ref<Record<string, string>>({});

  const devicesByZone = computed(() => {
    const grouped: Record<string, HomeyDevice[]> = {};
    for (const device of Object.values(devices.value)) {
      if (!grouped[device.zoneId]) {
        grouped[device.zoneId] = [];
      }
      grouped[device.zoneId].push(device);
    }
    // Sort devices within each zone by resolved name
    for (const list of Object.values(grouped)) {
      list.sort((a, b) => getDeviceName(a.id).localeCompare(getDeviceName(b.id)));
    }
    return grouped;
  });

  function setDevices(newDevices: Record<string, HomeyDevice>) {
    devices.value = newDevices;
  }

  function updateDevice(device: HomeyDevice) {
    devices.value[device.id] = device;
  }

  function removeDevice(deviceId: string) {
    delete devices.value[deviceId];
  }

  function updateCapability(
    deviceId: string,
    capabilityId: string,
    value: unknown
  ) {
    const device = devices.value[deviceId];
    if (device?.capabilities[capabilityId]) {
      device.capabilities[capabilityId].value = value;
    }
  }

  async function setCapabilityValue(
    deviceId: string,
    capabilityId: string,
    value: unknown
  ) {
    const res = await fetch(
      `/api/devices/${deviceId}/capability/${capabilityId}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value }),
      }
    );
    if (!res.ok) {
      const body = await res.json();
      throw new Error(body.error ?? "Failed to set capability");
    }
  }

  async function fetchDeviceOverrides() {
    try {
      const res = await fetch("/api/device-overrides");
      if (res.ok) {
        deviceOverrides.value = await res.json();
      }
    } catch {
      // ignore
    }
  }

  async function setDeviceOverride(deviceId: string, name: string) {
    deviceOverrides.value[deviceId] = name;
    await fetch("/api/device-overrides", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(deviceOverrides.value),
    });
  }

  async function clearDeviceOverride(deviceId: string) {
    delete deviceOverrides.value[deviceId];
    await fetch("/api/device-overrides", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(deviceOverrides.value),
    });
  }

  function getDeviceName(deviceId: string): string {
    if (deviceOverrides.value[deviceId]) return deviceOverrides.value[deviceId];
    return devices.value[deviceId]?.name ?? "Unknown";
  }

  return {
    devices,
    deviceOverrides,
    devicesByZone,
    setDevices,
    updateDevice,
    removeDevice,
    updateCapability,
    setCapabilityValue,
    fetchDeviceOverrides,
    setDeviceOverride,
    clearDeviceOverride,
    getDeviceName,
  };
});
