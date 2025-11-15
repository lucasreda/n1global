import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Use process.cwd() as fallback for Railway compatibility
const projectRoot = process.cwd();
const clientDir = path.resolve(projectRoot, "client");
const indexHtmlPath = path.resolve(clientDir, "index.html");

// Log paths for debugging in Railway
if (process.env.NODE_ENV === "production") {
  console.log("🔍 [VITE CONFIG] projectRoot:", projectRoot);
  console.log("🔍 [VITE CONFIG] clientDir:", clientDir);
  console.log("🔍 [VITE CONFIG] indexHtmlPath:", indexHtmlPath);
  console.log("🔍 [VITE CONFIG] index.html exists:", require("fs").existsSync(indexHtmlPath));
}

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
  root: projectRoot,
  build: {
    outDir: path.resolve(projectRoot, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: indexHtmlPath,
      },
    },
  },
  publicDir: path.resolve(clientDir, "public"),
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
