import { defineConfig, loadEnv } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const pkg = JSON.parse(readFileSync("package.json", "utf8"));

export default defineConfig(({ mode }) => {
  // .env optionnel : CALDERIS_OUT=/mnt/c/Users/Shua/AppData/Local/FoundryVTT/Data/modules/calderis-suite
  const env = loadEnv(mode, process.cwd(), "");
  const OUT =
    env.CALDERIS_OUT || "/mnt/c/Users/Shua/AppData/Local/FoundryVTT/Data/modules/calderis-suite";

  return {
    build: {
      outDir: OUT,
      emptyOutDir: true,
      sourcemap: true,
      lib: {
        entry: path.resolve(__dirname, "src/index.ts"),
        name: "CalderisSuite", // nom UMD/legacy (inoffensif ici)
        formats: ["es"], // 👈 ES module pour `esmodules` dans module.json
        fileName: () => "module.js",
      },
      rollupOptions: {
        // souvent inutile, mais pratique si tu importes dynamiquement
        output: { inlineDynamicImports: true },
      },
    },
    resolve: { alias: { "@": path.resolve(__dirname, "src") } },
    plugins: [
      viteStaticCopy({
        targets: [
          {
            src: "module.json",
            dest: ".",
            transform: (content) => content.toString().replace(/__VERSION__/g, pkg.version),
          },
          { src: "lang", dest: "." },
          { src: "styles", dest: "." },
          { src: "assets", dest: "." },
          { src: "packs", dest: "." },
          { src: "src/templates", dest: "." },
        ],
      }),
    ],
  };
});
