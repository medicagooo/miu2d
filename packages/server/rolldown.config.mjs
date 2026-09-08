import path from "node:path";

// Compile legacy decorators with tsc first, then bundle JS. Windows drive paths
// are filesystem paths, not external package names.
export default {
  input: {
    main: "dist-compiled/main.js",
    "db/migrate": "dist-compiled/db/migrate.js",
    "db/rehash-passwords": "dist-compiled/db/rehash-passwords.js",
    "db/patch-null-scene-data": "dist-compiled/db/patch-null-scene-data.js",
  },
  output: { format: "es", dir: "dist", entryFileNames: "[name].js", chunkFileNames: "chunks/[name]-[hash].js", sourcemap: true },
  external: (id) => id.startsWith("node:") || id.startsWith("cloudflare:") ||
    (!id.startsWith(".") && !path.isAbsolute(id) && !id.startsWith("@/") && !id.startsWith("@miu2d/")),
};
