import { AsyncLocalStorage } from "node:async_hooks";
import type { PrismaClient } from "@prisma/client";

export interface ImageProcessor {
  metadata(bytes: Buffer): Promise<{ width?: number; height?: number }>;
  resize(bytes: Buffer, size: number): Promise<Buffer>;
}

export interface RuntimeContext {
  db: PrismaClient;
  images: ImageProcessor;
  rateLimit: (key: string, max: number, windowMs: number) => Promise<number>;
  background?: (task: Promise<unknown>) => void;
}

// AI-TRACE: Worker entry scopes I/O clients to one request; existing services access
// the scoped Prisma proxy. Node keeps its process-wide pool and image implementation.
export const runtimeContext = new AsyncLocalStorage<RuntimeContext>();
export function backgroundTask(task: Promise<unknown>): void {
  const runtime = runtimeContext.getStore();
  if (runtime?.background) runtime.background(task);
  else
    void task.catch((error) =>
      console.error("Background task failed", error instanceof Error ? error.name : "UnknownError")
    );
}
let nodeImages: ImageProcessor | undefined;
export function configureNodeImages(images: ImageProcessor) {
  nodeImages = images;
}
export function getImageProcessor(): ImageProcessor {
  const images = runtimeContext.getStore()?.images ?? nodeImages;
  if (!images) throw new Error("Image processor is not configured");
  return images;
}
