import { EventEmitter } from "node:events";
import { HomeyAPI } from "homey-api";
import type { HomeyDevice, HomeyZone, DeviceCapability, HomeyConnectionStatus } from "@homecontrol/shared";
import { config } from "../config.js";

const HEARTBEAT_INTERVAL = 30_000; // 30s
const RECONNECT_BASE_DELAY = 2_000; // 2s
const RECONNECT_MAX_DELAY = 60_000; // 60s

export class HomeyService extends EventEmitter {
  private api: any = null;
  private devices = new Map<string, HomeyDevice>();
  private zones = new Map<string, HomeyZone>();
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempt = 0;
  private _status: HomeyConnectionStatus = "disconnected";
  private isReconnecting = false;

  get status(): HomeyConnectionStatus {
    return this._status;
  }

  private setStatus(status: HomeyConnectionStatus) {
    if (this._status === status) return;
    this._status = status;
    this.emit("homey:status", status);
    console.log(`Homey connection status: ${status}`);
  }

  async connect() {
    console.log(`Connecting to Homey at ${config.homeyAddress}...`);

    try {
      this.api = await (HomeyAPI as any).createLocalAPI({
        address: config.homeyAddress,
        token: config.homeyToken,
      });

      console.log("Connected to Homey.");

      await this.loadZones();
      await this.loadDevices();
      this.subscribeToDeviceEvents();
      this.startHeartbeat();
      this.reconnectAttempt = 0;
      this.setStatus("connected");
    } catch (err) {
      console.error("Failed to connect to Homey:", (err as Error).message);
      this.setStatus("disconnected");
      this.scheduleReconnect();
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => this.heartbeat(), HEARTBEAT_INTERVAL);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private async heartbeat() {
    try {
      // Lightweight API call to verify the connection is alive
      await this.api.zones.getZones();
    } catch (err) {
      console.warn("Homey heartbeat failed:", (err as Error).message);
      this.handleConnectionLost();
    }
  }

  private handleConnectionLost() {
    if (this.isReconnecting) return;
    this.stopHeartbeat();
    this.setStatus("reconnecting");
    this.scheduleReconnect();
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;

    const delay = Math.min(
      RECONNECT_BASE_DELAY * Math.pow(2, this.reconnectAttempt),
      RECONNECT_MAX_DELAY,
    );
    this.reconnectAttempt++;

    console.log(`Scheduling reconnect in ${Math.round(delay / 1000)}s (attempt ${this.reconnectAttempt})...`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.reconnect();
    }, delay);
  }

  private async reconnect() {
    if (this.isReconnecting) return;
    this.isReconnecting = true;
    this.setStatus("reconnecting");

    console.log("Attempting to reconnect to Homey...");

    try {
      // Destroy old API connection
      try {
        if (this.api) {
          this.api.devices?.removeAllListeners?.();
          await this.api.destroy?.();
        }
      } catch {
        // Ignore cleanup errors
      }

      this.api = await (HomeyAPI as any).createLocalAPI({
        address: config.homeyAddress,
        token: config.homeyToken,
      });

      // Clear old state
      this.devices.clear();
      this.zones.clear();

      await this.loadZones();
      await this.loadDevices();
      this.subscribeToDeviceEvents();
      this.startHeartbeat();
      this.reconnectAttempt = 0;
      this.isReconnecting = false;
      this.setStatus("connected");

      // Push fresh state to all clients
      this.emit("state:resync");

      console.log("Reconnected to Homey successfully.");
    } catch (err) {
      console.error("Reconnect failed:", (err as Error).message);
      this.isReconnecting = false;
      this.setStatus("reconnecting");
      this.scheduleReconnect();
    }
  }

  private async loadZones() {
    const zones = await this.api.zones.getZones() as Record<string, any>;

    for (const [id, zone] of Object.entries(zones)) {
      this.zones.set(id, {
        id,
        name: zone.name,
        order: zone.order ?? 0,
        parent: zone.parent ?? null,
        icon: zone.icon ?? "",
      });
    }

    console.log(`Loaded ${this.zones.size} zones.`);
  }

  private async loadDevices() {
    const devices = await this.api.devices.getDevices() as Record<string, any>;

    for (const [id, device] of Object.entries(devices)) {
      this.devices.set(id, this.normalizeDevice(device));
      this.subscribeToCapabilities(device);
    }

    console.log(`Loaded ${this.devices.size} devices.`);
  }

  private normalizeDevice(raw: any): HomeyDevice {
    const zone = this.zones.get(raw.zone);
    const capabilities: Record<string, DeviceCapability> = {};

    for (const capId of raw.capabilities ?? []) {
      const capObj = raw.capabilitiesObj?.[capId];
      if (!capObj) continue;

      capabilities[capId] = {
        id: capId,
        type: capObj.type ?? "string",
        title: capObj.title ?? capId,
        getable: capObj.getable ?? false,
        setable: capObj.setable ?? false,
        value: capObj.value,
        min: capObj.min,
        max: capObj.max,
        step: capObj.step,
        units: capObj.units,
        values: capObj.values,
      };
    }

    return {
      id: raw.id,
      name: raw.name,
      zoneName: zone?.name ?? "Unknown",
      zoneId: raw.zone ?? "",
      class: raw.class ?? "",
      iconUrl: raw.iconObj?.url ?? null,
      available: raw.available ?? true,
      capabilities,
    };
  }

  private subscribeToCapabilities(device: any) {
    for (const capId of device.capabilities ?? []) {
      try {
        const instance = device.makeCapabilityInstance(capId, (value: unknown) => {
          const cached = this.devices.get(device.id);
          if (!cached) return;

          if (cached.capabilities[capId]) {
            cached.capabilities[capId].value = value;
          }

          this.emit("capability:updated", {
            deviceId: device.id,
            capabilityId: capId,
            value,
          });
        });
      } catch (err) {
        console.warn(
          `Could not subscribe to ${device.name}.${capId}:`,
          (err as Error).message
        );
      }
    }
  }

  private subscribeToDeviceEvents() {
    this.api.devices.on("device.create", (device: any) => {
      const normalized = this.normalizeDevice(device);
      this.devices.set(device.id, normalized);
      this.subscribeToCapabilities(device);
      this.emit("device:added", normalized);
      console.log(`Device added: ${device.name}`);
    });

    this.api.devices.on("device.update", (device: any) => {
      const normalized = this.normalizeDevice(device);
      this.devices.set(device.id, normalized);
      this.emit("device:updated", normalized);
    });

    this.api.devices.on("device.delete", (device: any) => {
      this.devices.delete(device.id);
      this.emit("device:removed", device.id);
      console.log(`Device removed: ${device.name}`);
    });
  }

  getDevices(): Record<string, HomeyDevice> {
    return Object.fromEntries(this.devices);
  }

  getZones(): Record<string, HomeyZone> {
    return Object.fromEntries(this.zones);
  }

  async setCapabilityValue(
    deviceId: string,
    capabilityId: string,
    value: unknown
  ) {
    const device = await this.api.devices.getDevice({ id: deviceId });
    await device.setCapabilityValue({ capabilityId, value });
  }

  async getFlows(): Promise<Record<string, { id: string; name: string }>> {
    const flows = await this.api.flow.getFlows() as Record<string, any>;
    const result: Record<string, { id: string; name: string }> = {};
    for (const [id, flow] of Object.entries(flows as Record<string, any>)) {
      result[id] = { id, name: flow.name };
    }
    return result;
  }

  async triggerFlow(flowId: string) {
    const flow = await this.api.flow.getFlow({ id: flowId });
    await flow.trigger();
  }

  async getInsightLogs() {
    const logs = await this.api.insights.getLogs();
    return logs;
  }

  async getInsightEntries(logId: string, resolution: string) {
    // Call manager-level getLogEntries directly — Log.getEntries() ignores resolution
    const entries = await this.api.insights.getLogEntries({ id: logId, resolution });
    return entries;
  }
}
