import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// `base: "./"` lets the built app be hosted from any sub-path (S3, nginx, GitHub Pages...).
export default defineConfig({
  base: "./",
  plugins: [react()],
  server: { port: 5173 },
});
