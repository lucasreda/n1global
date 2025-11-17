import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import fs from "fs";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

// Plugin para remover crossorigin dos links CSS e scripts no HTML gerado
function removeCrossoriginPlugin(): Plugin {
  return {
    name: "remove-crossorigin",
    closeBundle() {
      // Usar closeBundle que é chamado após todos os bundles serem escritos
      const outDir = path.resolve(process.cwd(), "dist/public");
      const htmlPath = path.resolve(outDir, "index.html");
      
      console.log(`🔍 [BUILD] Verificando HTML em: ${htmlPath}`);
      
      if (!fs.existsSync(htmlPath)) {
        console.warn(`⚠️ [BUILD] index.html não encontrado em ${htmlPath}`);
        return;
      }
      
      try {
        let htmlContent = fs.readFileSync(htmlPath, "utf-8");
        const originalContent = htmlContent;
        
        // Verificar se há crossorigin antes de remover
        const hasCrossoriginBefore = /crossorigin/i.test(htmlContent);
        console.log(`🔍 [BUILD] HTML tem crossorigin antes: ${hasCrossoriginBefore}`);
        
        // Remover crossorigin de links CSS (pode estar em qualquer posição no atributo)
        htmlContent = htmlContent.replace(
          /<link([^>]*rel=["']stylesheet["'][^>]*)crossorigin(?:=["'][^"']*["'])?([^>]*)>/gi,
          '<link$1$2>'
        );
        
        // Remover crossorigin de scripts module (pode estar em qualquer posição no atributo)
        htmlContent = htmlContent.replace(
          /<script([^>]*type=["']module["'][^>]*)crossorigin(?:=["'][^"']*["'])?([^>]*)>/gi,
          '<script$1$2>'
        );
        
        // Também remover crossorigin standalone (sem aspas ou com aspas)
        htmlContent = htmlContent.replace(/\s+crossorigin(?:=["'][^"']*["'])?/gi, '');
        
        // Verificar se ainda há crossorigin após remoção
        const hasCrossoriginAfter = /crossorigin/i.test(htmlContent);
        console.log(`🔍 [BUILD] HTML tem crossorigin depois: ${hasCrossoriginAfter}`);
        
        if (htmlContent !== originalContent) {
          fs.writeFileSync(htmlPath, htmlContent, "utf-8");
          console.log("✅ [BUILD] Removed crossorigin attributes from index.html");
        } else if (hasCrossoriginBefore) {
          console.warn("⚠️ [BUILD] HTML tinha crossorigin mas não foi removido - regex pode estar incorreto");
        } else {
          console.log("ℹ️ [BUILD] HTML não tinha crossorigin para remover");
        }
      } catch (error) {
        console.error("❌ [BUILD] Erro ao remover crossorigin do HTML:", error);
      }
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
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
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
