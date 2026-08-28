import fs from "node:fs";
import path from "node:path";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

function pwaPrecachePlugin(): Plugin {
  let outputDirectory = "";

  return {
    name: "eduai-pwa-precache",
    apply: "build",
    configResolved(config) {
      outputDirectory = config.build.outDir;
    },
    writeBundle(_options, bundle) {
      const generatedAssets = Object.keys(bundle)
        .filter((fileName) => /\.(?:js|css|woff2?|ttf|otf)$/i.test(fileName))
        .map((fileName) => JSON.stringify(`/${fileName}`))
        .join(",\n  ");
      const serviceWorkerSource = fs.readFileSync(
        path.resolve(__dirname, "public/sw.js"),
        "utf8",
      );
      const serviceWorker = serviceWorkerSource.replace(
        "  /* EDUAI_VITE_PRECACHE */",
        generatedAssets ? `  ${generatedAssets}` : "",
      );
      fs.writeFileSync(path.resolve(outputDirectory, "sw.js"), serviceWorker, "utf8");
    },
  };
}

export default defineConfig({
  plugins: [react(), pwaPrecachePlugin()],
  server: {
    proxy: {
      "/api/v1": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
