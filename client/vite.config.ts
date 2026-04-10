import fs, { copyFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * - Production: copy hand-written SW to dist after build.
 * - Dev: serve `/sw.js` from `src/sw.js` so registration matches production path.
 */
function serviceWorkerPlugin() {
  const swPath = path.resolve(__dirname, "src/sw.js");
  return {
    name: "service-worker",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split("?")[0];
        if (url === "/sw.js") {
          res.setHeader("Content-Type", "application/javascript; charset=utf-8");
          fs.createReadStream(swPath).pipe(res);
          return;
        }
        next();
      });
    },
    closeBundle() {
      const outDir = path.resolve("dist");
      mkdirSync(outDir, { recursive: true });
      copyFileSync(swPath, path.resolve(outDir, "sw.js"));
    },
  };
}

export default defineConfig({
  plugins: [react(), serviceWorkerPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // Client only calls same-origin /api/* — Vite forwards to the Express proxy.
      "/api": {
        target: "http://localhost:5174",
        changeOrigin: true,
      },
    },
  },
});
