import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src")
    }
  },
  server: {
    port: 5173,
    hmr: {
      overlay: false
    }
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    minify: 'esbuild',
    target: 'esnext'
  },
  optimizeDeps: {
    exclude: []
  }
});
