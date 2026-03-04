import { validateConfig } from "./config.js";
import { createServer } from "./server.js";

validateConfig();
createServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
