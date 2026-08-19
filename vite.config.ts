import { defineConfig } from "vitest/config";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { nitro } from "nitro/vite";

const isTest = process.env.VITEST === "true";

export default defineConfig(({ command }) => ({
  server: { host: "0.0.0.0", port: 8080, strictPort: true },
  plugins: isTest
    ? [tsconfigPaths(), viteReact()]
    : [
        tsconfigPaths(),
        tailwindcss(),
        tanstackStart(),
        ...(command === "build" ? [nitro({ preset: "vercel" })] : []),
        viteReact(),
      ],
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
  },
}));
