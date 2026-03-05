import type { FastifyInstance } from "fastify";
import { resolve } from "node:path";
import { mkdir, readdir, unlink } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import { randomUUID } from "node:crypto";

const DATA_DIR = process.env.DATA_DIR ?? resolve(import.meta.dirname, "../../../..");
const UPLOADS_DIR = resolve(DATA_DIR, "dashboards", "uploads");

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
]);

const EXT_MAP: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
  "image/svg+xml": ".svg",
};

export function registerUploadRoutes(app: FastifyInstance) {
  // POST /api/uploads — upload an image
  app.post("/api/uploads", async (request, reply) => {
    const data = await request.file();
    if (!data) {
      return reply.code(400).send({ error: "No file uploaded" });
    }

    if (!ALLOWED_TYPES.has(data.mimetype)) {
      // Consume the stream to avoid hanging
      data.file.resume();
      return reply.code(400).send({ error: "Invalid image type" });
    }

    const ext = EXT_MAP[data.mimetype] ?? ".bin";
    const filename = `${randomUUID()}${ext}`;
    await mkdir(UPLOADS_DIR, { recursive: true });
    const destPath = resolve(UPLOADS_DIR, filename);

    await pipeline(data.file, createWriteStream(destPath));

    if (data.file.truncated) {
      await unlink(destPath);
      return reply.code(413).send({ error: "File too large (10MB max)" });
    }

    return { url: `/uploads/${filename}` };
  });

  // GET /api/uploads — list uploaded images
  app.get("/api/uploads", async () => {
    await mkdir(UPLOADS_DIR, { recursive: true });
    const files = await readdir(UPLOADS_DIR);
    return files
      .filter((f) => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(f))
      .map((f) => ({ filename: f, url: `/uploads/${f}` }));
  });

  // DELETE /api/uploads/:filename — delete an uploaded image
  app.delete<{ Params: { filename: string } }>(
    "/api/uploads/:filename",
    async (request, reply) => {
      const { filename } = request.params;
      // Sanitize: only allow simple filenames
      if (/[/\\]/.test(filename) || filename.includes("..")) {
        return reply.code(400).send({ error: "Invalid filename" });
      }
      const filePath = resolve(UPLOADS_DIR, filename);
      try {
        await unlink(filePath);
        return { ok: true };
      } catch {
        return reply.code(404).send({ error: "File not found" });
      }
    }
  );
}
