import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
export default defineConfig({
  root: "src/dashboard",
  plugins: [
    tanstackRouter({
      target: "react",
      routesDirectory: "./routes",
      generatedRouteTree: "./routeTree.gen.ts",
      autoCodeSplitting: true,
    }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src/dashboard", import.meta.url)) },
  },
  build: { outDir: "../../dist/public", emptyOutDir: true },
  server: {
    host: "127.0.0.1",
    port: 5173,
    proxy: {
      "/api": "http://127.0.0.1:3000",
      "/script.js": "http://127.0.0.1:3000",
      "/health": "http://127.0.0.1:3000",
    },
  },
});
