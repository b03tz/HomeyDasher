import type { FastifyInstance } from "fastify";
import type { HomeyService } from "../services/HomeyService.js";

export function registerZoneRoutes(
  app: FastifyInstance,
  homey: HomeyService
) {
  app.get("/api/zones", async () => {
    return homey.getZones();
  });
}
