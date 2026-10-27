/**
 * Copia dentro il repository i pacchetti Swift dei plugin Capacitor che
 * `cap sync ios` fa puntare a node_modules.
 *
 * Sul Mac si fa solo `git pull` e si apre Xcode (docs/IOS.md): con un
 * `.package(path: "../../../node_modules/...")` in CapApp-SPM/Package.swift
 * Xcode non risolverebbe il grafo dei pacchetti. Qui ogni plugin viene
 * copiato in ios/capacitor-libs/<nome> (solo Package.swift e ios/) e il
 * percorso riscritto. Gemello di vendor-capacitor-android.mjs, gira dopo ogni
 * `cap sync ios`.
 */
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const radice = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const filePacchetto = join(radice, "ios", "App", "CapApp-SPM", "Package.swift");
const cartellaCopie = join(radice, "ios", "capacitor-libs");

const originale = readFileSync(filePacchetto, "utf8");

// .package(name: "CapacitorPushNotifications", path: "../../../node_modules/@capacitor/push-notifications")
const riga = /\.package\(name: "([^"]+)", path: "\.\.\/\.\.\/\.\.\/(node_modules\/[^"]+)"\)/g;
const plugin = [...originale.matchAll(riga)].map((m) => ({ nome: m[1], percorso: m[2] }));

if (plugin.length === 0) {
  console.log("Nessun plugin da copiare: Package.swift non punta a node_modules.");
  process.exit(0);
}

rmSync(cartellaCopie, { recursive: true, force: true });
mkdirSync(cartellaCopie, { recursive: true });

let riscritto = originale;
for (const { nome, percorso } of plugin) {
  const sorgente = join(radice, percorso);
  if (!existsSync(join(sorgente, "Package.swift"))) {
    console.error(`Manca ${percorso}/Package.swift: lancia prima \`npm ci\`.`);
    process.exit(1);
  }
  const destinazione = join(cartellaCopie, nome);
  cpSync(join(sorgente, "Package.swift"), join(destinazione, "Package.swift"));
  cpSync(join(sorgente, "ios"), join(destinazione, "ios"), { recursive: true });
  riscritto = riscritto.replace(`path: "../../../${percorso}"`, `path: "../../capacitor-libs/${nome}"`);
  console.log(`copiato ${nome} da ${percorso}`);
}

writeFileSync(filePacchetto, riscritto, "utf8");
console.log("CapApp-SPM/Package.swift riscritto sulle copie in ios/capacitor-libs/.");
