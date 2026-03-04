import type { FastifyInstance } from "fastify";
import type { HomeyService } from "../services/HomeyService.js";

export function registerFlowRoutes(
  app: FastifyInstance,
  homey: HomeyService
) {
  app.get("/api/flows", async () => {
    return homey.getFlows();
  });

  app.post<{ Params: { id: string } }>(
    "/api/flows/:id/trigger",
    async (request, reply) => {
      const { id } = request.params;
      try {
        await homey.triggerFlow(id);
        return { success: true };
      } catch (err) {
        reply.status(500);
        return { success: false, error: (err as Error).message };
      }
    }
  );
}
