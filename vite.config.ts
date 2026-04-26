import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

const isTauri = process.env.TAURI_ENV_ARCH !== undefined;

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: isTauri ? "localhost" : "::",
    port: 8080,
    strictPort: true,
    hmr: {
      overlay: false,
    },
  },
  envPrefix: ["VITE_", "TAURI_ENV_"],
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
  build: {
    target: isTauri ? ["es2021", "chrome100", "safari13"] : "modules",
    minify: !process.env.TAURI_ENV_DEBUG ? "esbuild" : false,
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
  },
}));
