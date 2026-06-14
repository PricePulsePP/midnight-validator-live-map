import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  publicDir: "site",
  build: {
    outDir: "dist",
    emptyOutDir: true
  }
});
