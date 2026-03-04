import Fastify from "fastify";
import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import { Server } from "socket.io";
import { resolve } from "node:path";
import { access } from "node:fs/promises";
import type {
  ServerToClientEvents,
  ClientToServerEvents,
} from "@homecontrol/shared";
import { HomeyService } from "./services/HomeyService.js";
import { registerDeviceRoutes } from "./routes/devices.js";
import { registerZoneRoutes } from "./routes/zones.js";
import { registerDashboardRoutes } from "./routes/dashboard.js";
import { registerConfigRoutes } from "./routes/config.js";
import { registerInsightRoutes } from "./routes/insights.js";
import { registerFlowRoutes } from "./routes/flows.js";
import { setupSocketHandler } from "./socket/handler.js";
import { config } from "./config.js";

export async function createServer() {
  const app = Fastify({ logger: true });

  await app.register(cors, { origin: true });

  const homey = new HomeyService();

  // REST routes (registered first so they take precedence over static files)
  registerDeviceRoutes(app, homey);
  registerZoneRoutes(app, homey);
  registerDashboardRoutes(app);
  registerConfigRoutes(app);
  registerInsightRoutes(app, homey);
  registerFlowRoutes(app, homey);

  // Serve frontend static files in production (when dist folder exists)
  const frontendDist = resolve(import.meta.dirname, "../../frontend/dist");
  let servingStatic = false;
  try {
    await access(frontendDist);
    await app.register(fastifyStatic, {
      root: frontendDist,
      prefix: "/",
      wildcard: false,
    });
    // SPA fallback: serve index.html for non-API routes that don't match a file
    app.setNotFoundHandler(async (request, reply) => {
      if (request.url.startsWith("/api/")) {
        return reply.code(404).send({ error: "Not found" });
      }
      return reply.sendFile("index.html");
    });
    servingStatic = true;
  } catch {
    // Frontend dist not built — skip static serving (dev mode)
  }

  // Start HTTP server
  await app.listen({ port: config.port, host: "0.0.0.0" });

  // Socket.io on top of Fastify's underlying HTTP server
  const io = new Server<ClientToServerEvents, ServerToClientEvents>(
    app.server,
    {
      cors: { origin: "*" },
    }
  );

  setupSocketHandler(io, homey);

  // Connect to Homey after server is listening
  await homey.connect();

  console.log(`Server running on http://0.0.0.0:${config.port}`);
  if (servingStatic) {
    console.log(`Serving frontend from ${frontendDist}`);
  }
  return { app, io, homey };
}
