import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  root: "src/dashboard",
  plugins: [react()],
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
