import type { FastifyInstance } from "fastify";
import http, { type IncomingMessage } from "node:http";
import type { Socket } from "node:net";
import { config } from "../config.js";

/** Derive a safe go2rtc stream name from an RTSP URL */
export function rtspUrlToStreamName(rtspUrl: string): string {
  try {
    const u = new URL(rtspUrl);
    const host = u.hostname.replace(/\./g, "_");
    const port = u.port && u.port !== "554" ? `_${u.port}` : "";
    const path = u.pathname.replace(/[^a-zA-Z0-9]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
    return `cam_${host}${port}${path ? "_" + path : ""}`;
  } catch {
    return "cam_" + rtspUrl.replace(/[^a-zA-Z0-9]/g, "_").replace(/_+/g, "_").slice(0, 60);
  }
}

/** Register a stream with go2rtc (creates or updates) */
export async function registerGo2rtcStream(streamName: string, rtspUrl: string): Promise<void> {
  const base = config.go2rtcUrl.replace(/\/+$/, "");
  const url = `${base}/api/streams?name=${encodeURIComponent(streamName)}&src=${encodeURIComponent(rtspUrl)}`;
  try {
    await fetch(url, { method: "PUT" });
  } catch (e) {
    console.warn(`Failed to register go2rtc stream "${streamName}":`, (e as Error).message);
  }
}

/** Remove a stream from go2rtc */
export async function removeGo2rtcStream(streamName: string): Promise<void> {
  const base = config.go2rtcUrl.replace(/\/+$/, "");
  try {
    await fetch(`${base}/api/streams?src=${encodeURIComponent(streamName)}`, { method: "DELETE" });
  } catch {
    // Ignore — go2rtc may not be running
  }
}

/**
 * Handle a single go2rtc WebSocket upgrade: proxy /api/go2rtc/ws → go2rtc /api/ws
 */
export function handleGo2rtcUpgrade(req: IncomingMessage, socket: Socket, head: Buffer) {
  // Attach error handler immediately to prevent unhandled 'error' crash
  socket.on("error", (e) => {
    console.warn("go2rtc proxy: client socket error:", (e as Error).message);
  });

  const url = req.url ?? "";
  // Rewrite path: /api/go2rtc/ws?src=... → /api/ws?src=...
  const targetPath = url.replace("/api/go2rtc/ws", "/api/ws");
  const go2rtcBase = config.go2rtcUrl.replace(/\/+$/, "");
  const targetParsed = new URL(`${go2rtcBase}${targetPath}`);

  // Strip origin header — go2rtc rejects cross-origin WebSocket (403)
  const { origin, ...headers } = req.headers;
  const proxyReq = http.request({
    hostname: targetParsed.hostname,
    port: targetParsed.port,
    path: targetParsed.pathname + targetParsed.search,
    method: "GET",
    headers: {
      ...headers,
      host: targetParsed.host,
    },
  });

  proxyReq.on("upgrade", (_res: IncomingMessage, proxySocket: Socket, proxyHead: Buffer) => {
    proxySocket.on("error", (e) => {
      console.warn("go2rtc proxy: upstream socket error:", (e as Error).message);
      socket.end();
    });

    socket.write(
      "HTTP/1.1 101 Switching Protocols\r\n" +
      "Upgrade: websocket\r\n" +
      "Connection: Upgrade\r\n" +
      `Sec-WebSocket-Accept: ${_res.headers["sec-websocket-accept"]}\r\n` +
      "\r\n"
    );

    if (proxyHead.length > 0) socket.write(proxyHead);

    // Bidirectional pipe
    proxySocket.pipe(socket);
    socket.pipe(proxySocket);

    proxySocket.on("error", () => socket.end());
    socket.on("error", () => proxySocket.end());
    proxySocket.on("close", () => socket.end());
    socket.on("close", () => proxySocket.end());
  });

  proxyReq.on("error", () => {
    socket.end();
  });

  proxyReq.end();
}

/**
 * Install upgrade dispatcher: routes go2rtc WebSocket upgrades before Socket.io
 * can interfere. Must be called AFTER Socket.io is attached to the server.
 */
export function installUpgradeDispatch(app: FastifyInstance) {
  const server = app.server;

  // Capture all existing upgrade listeners (Socket.io's handler, etc.)
  const existingListeners = server.listeners("upgrade").slice() as Array<
    (req: IncomingMessage, socket: Socket, head: Buffer) => void
  >;
  server.removeAllListeners("upgrade");

  // Single dispatcher: go2rtc first, then everything else
  server.on("upgrade", (req: IncomingMessage, socket: Socket, head: Buffer) => {
    const url = req.url ?? "";
    if (url.startsWith("/api/go2rtc/ws")) {
      handleGo2rtcUpgrade(req, socket, head);
    } else {
      for (const listener of existingListeners) {
        listener.call(server, req, socket, head);
      }
    }
  });
}
