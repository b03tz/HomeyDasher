import type { FastifyInstance } from "fastify";
import type { HomeyService } from "../services/HomeyService.js";

export function registerDeviceRoutes(
  app: FastifyInstance,
  homey: HomeyService
) {
  app.get("/api/devices", async () => {
    return homey.getDevices();
  });

  app.put<{
    Params: { id: string; capabilityId: string };
    Body: { value: unknown };
  }>("/api/devices/:id/capability/:capabilityId", async (request, reply) => {
    const { id, capabilityId } = request.params;
    const { value } = request.body;

    try {
      await homey.setCapabilityValue(id, capabilityId, value);
      return { success: true };
    } catch (err) {
      reply.status(500);
      return { success: false, error: (err as Error).message };
    }
  });
}
