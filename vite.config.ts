// vite.config.ts (extrait)
import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { viteStaticCopy } from "vite-plugin-static-copy";
import fs from "node:fs";

const __dirname = dirname(fileURLToPath(new URL(import.meta.url)));
const OUT = resolve("/mnt/c/Users/Shua/AppData/Local/FoundryVTT/Data/modules/calderis-suite");

function copyTargetsFromSrc() {
  const maybe = (p: string) => (fs.existsSync(p) ? p : null);

  const srcLang = maybe(resolve(__dirname, "src/lang"));
  const srcTemplates = maybe(resolve(__dirname, "src/templates"));
  const srcAssets = maybe(resolve(__dirname, "src/assets"));
  const srcStyles = maybe(resolve(__dirname, "src/styles"));
  const srcPacks = maybe(resolve(__dirname, "src/packs"));

  const rootLang = maybe(resolve(__dirname, "lang"));
  const rootTemplates = maybe(resolve(__dirname, "templates"));
  const rootAssets = maybe(resolve(__dirname, "assets"));
  const rootStyles = maybe(resolve(__dirname, "styles"));
  const rootPacks = maybe(resolve(__dirname, "packs"));

  const t: { src: string; dest: string }[] = [];

  // Préfère src/* s’il existe, sinon racine/*
  if (srcLang) t.push({ src: "src/lang", dest: "." });
  else if (rootLang) t.push({ src: "lang", dest: "." });

  if (srcTemplates) t.push({ src: "src/templates", dest: "." });
  else if (rootTemplates) t.push({ src: "templates", dest: "." });

  if (srcAssets) t.push({ src: "src/assets", dest: "." });
  else if (rootAssets) t.push({ src: "assets", dest: "." });

  if (srcStyles) t.push({ src: "src/styles", dest: "." });
  else if (rootStyles) t.push({ src: "styles", dest: "." });

  if (srcPacks) t.push({ src: "src/packs", dest: "." });
  else if (rootPacks) t.push({ src: "packs", dest: "." });

  // module.json doit rester à la racine du module de sortie
  t.push({ src: "module.json", dest: "" });

  return t;
}

export default defineConfig(({ command }) => {
  const isWatch = command === "build" && process.argv.includes("--watch");
  const isDev = isWatch;

  return {
    resolve: { alias: { "@": resolve(__dirname, "src") } },
    publicDir: false,
    build: {
      outDir: OUT,
      emptyOutDir: false,
      sourcemap: true,
      lib: {
        entry: resolve(__dirname, "src/index.ts"),
        formats: ["es"],
        fileName: () => "index.js",
      },
      rollupOptions: {
        output: isDev
          ? {
              preserveModules: true,
              preserveModulesRoot: "src",
              entryFileNames: (c) => (c.name === "index" ? "index.js" : "chunks/[name].js"),
              chunkFileNames: "chunks/[name].js",
              assetFileNames: "assets/[name].[ext]",
            }
          : {
              entryFileNames: "index.js",
              chunkFileNames: "chunks/[name]-[hash].js",
            },
        treeshake: isDev ? false : undefined,
      },
      minify: isDev ? false : "esbuild",
      target: "es2020",
      watch: isDev
        ? {
            include: ["src/**", "styles/**"],
          }
        : null,
    },
    plugins: [
      viteStaticCopy({
        targets: copyTargetsFromSrc(), // ⬅️ copie depuis src/* si présents
      }),
    ],
  };
});
