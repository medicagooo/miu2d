import base from "./rolldown.config.mjs";

// Share the same JS bundling path with Node; native-only imports live in main.ts.
export default {
  ...base,
  input: { worker: "dist-compiled/worker.js" },
  output: { ...base.output, dir: "dist-worker" },
};
