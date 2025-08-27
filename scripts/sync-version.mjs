import fs from "node:fs";

const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const modPath = "module.json";
const mod = JSON.parse(fs.readFileSync(modPath, "utf8"));

mod.version = pkg.version;

fs.writeFileSync(modPath, JSON.stringify(mod, null, 2));
console.log(`✅ module.json synchronisé avec version ${pkg.version}`);
