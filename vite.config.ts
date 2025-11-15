import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Use process.cwd() as fallback for Railway compatibility
const projectRoot = process.cwd();
const clientDir = path.resolve(projectRoot, "client");

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(clientDir, "src"),
      "@shared": path.resolve(projectRoot, "shared"),
      "@assets": path.resolve(projectRoot, "attached_assets"),
    },
  },
  root: clientDir,
  build: {
    outDir: path.resolve(projectRoot, "dist/public"),
    emptyOutDir: true,
  },
  publicDir: path.resolve(clientDir, "public"),
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
