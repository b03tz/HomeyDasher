import type { FastifyInstance } from "fastify";
import type { HomeyService } from "../services/HomeyService.js";

export function registerInsightRoutes(
  app: FastifyInstance,
  homey: HomeyService
) {
  app.get("/api/insights/logs", async () => {
    return homey.getInsightLogs();
  });

  app.get<{
    Params: { logId: string };
    Querystring: { resolution?: string };
  }>("/api/insights/log/:logId/entries", async (request, reply) => {
    const { logId } = request.params;
    const resolution = request.query.resolution ?? "last24Hours";
    try {
      return await homey.getInsightEntries(logId, resolution);
    } catch (err) {
      reply.status(404);
      return { error: (err as Error).message };
    }
  });
}
