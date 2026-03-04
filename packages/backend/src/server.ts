import Fastify from "fastify";
import cors from "@fastify/cors";
import { Server } from "socket.io";
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

  // REST routes
  registerDeviceRoutes(app, homey);
  registerZoneRoutes(app, homey);
  registerDashboardRoutes(app);
  registerConfigRoutes(app);
  registerInsightRoutes(app, homey);
  registerFlowRoutes(app, homey);

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
  return { app, io, homey };
}
