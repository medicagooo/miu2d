import "dotenv/config";
import { serve } from "@hono/node-server";
import sharp from "sharp";
import { app } from "./app";
import { env } from "./env";
import { configureNodeImages } from "./runtime/context";

configureNodeImages({
  metadata: (bytes) => sharp(bytes).metadata(),
  resize: (bytes, size) =>
    sharp(bytes).resize(size, size, { fit: "cover", kernel: "lanczos3" }).png().toBuffer(),
});
serve({ fetch: app.fetch, port: env.port, hostname: "0.0.0.0" }, () => {
  console.log(`Application listening on port ${env.port}`);
});
