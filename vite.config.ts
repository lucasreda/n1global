import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

// Plugin to remove crossorigin attribute from HTML during build
function removeCrossoriginPlugin() {
  return {
    name: 'remove-crossorigin',
    generateBundle(options: any, bundle: any) {
      // This runs after all files are generated
      // We'll handle HTML modification in server/vite.ts instead
    },
    writeBundle(options: any) {
      // After build, modify index.html to remove crossorigin
      const htmlPath = path.resolve(options.dir || options.file, 'index.html');
      if (fs.existsSync(htmlPath)) {
        try {
          let htmlContent = fs.readFileSync(htmlPath, 'utf-8');
          const original = htmlContent;
          
          // Remove crossorigin from CSS links
          htmlContent = htmlContent.replace(
            /<link([^>]*?)>/gi,
            (match) => {
              if (!match.includes('rel="stylesheet') && !match.includes("rel='stylesheet")) {
                return match;
              }
              return match.replace(/\s+crossorigin\s*=\s*(["']?)([^"'\s>]*)\1/gi, '')
                         .replace(/\s+crossorigin/gi, '');
            }
          );
          
          // Remove crossorigin from script tags
          htmlContent = htmlContent.replace(
            /<script([^>]*?)>/gi,
            (match) => {
              if (!match.includes('type="module') && !match.includes("type='module")) {
                return match;
              }
              return match.replace(/\s+crossorigin\s*=\s*(["']?)([^"'\s>]*)\1/gi, '')
                         .replace(/\s+crossorigin/gi, '');
            }
          );
          
          if (htmlContent !== original) {
            fs.writeFileSync(htmlPath, htmlContent, 'utf-8');
            console.log('✅ [BUILD] Removed crossorigin attributes from index.html');
          }
        } catch (error) {
          console.warn('⚠️ [BUILD] Could not remove crossorigin from index.html:', error);
        }
      }
    },
  };
}

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
  console.log("🔍 [VITE CONFIG] index.html exists:", fs.existsSync(indexHtmlPath));
}

export default defineConfig({
  base: "/",
  plugins: [
    react(),
    runtimeErrorOverlay(),
    // Remove crossorigin from HTML during build
    removeCrossoriginPlugin(),
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
    extensions: [".js", ".jsx", ".ts", ".tsx", ".json"],
  },
  optimizeDeps: {
    include: ["@shared/schema"],
  },
  root: clientDir,
  build: {
    outDir: path.resolve(projectRoot, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(clientDir, "index.html"),
      },
      output: {
        // Don't add crossorigin attribute to assets
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    // Use a custom plugin to remove crossorigin from HTML after build
    // This is handled in server/vite.ts instead to avoid modifying build output
  },
  publicDir: path.resolve(clientDir, "public"),
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
