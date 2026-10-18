import { defineConfig, loadEnv } from "vite";
import { validatePublicEnvironment } from "./build/public-config.ts";
export default defineConfig(({ mode }) => {
  validatePublicEnvironment({
    ...loadEnv(mode, process.cwd(), "VITE_"),
    ...Object.fromEntries(
      Object.entries(process.env).filter(
        ([key, value]) => key.startsWith("VITE_") && typeof value === "string",
      ),
    ),
  } as Record<string, string>);
  return {
    base: "./",
    build: { target: "es2022" },
    server: { port: 5173, strictPort: true },
    preview: { port: 4173, strictPort: true },
  };
});
