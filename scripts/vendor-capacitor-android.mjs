/**
 * Copia dentro il repository i moduli Gradle che Capacitor tiene in
 * node_modules.
 *
 * `cap sync` genera android/capacitor.settings.gradle con percorsi tipo
 * `../node_modules/@capacitor/android/capacitor`. Su una macchina che ha solo
 * Android Studio quella cartella non esiste, e Gradle fallisce con
 * "No matching variant of project :capacitor-android was found. No variants
 * exist." perche' il modulo incluso non ha nessun build file.
 *
 * Qui i moduli vengono copiati in android/capacitor-libs/ e il file generato
 * viene riscritto per puntare alla copia. Gira subito dopo ogni `cap sync`,
 * quindi le copie restano allineate alla versione installata di Capacitor e
 * ai plugin aggiunti in futuro.
 */
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const radice = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const cartellaAndroid = join(radice, "android");
const fileImpostazioni = join(cartellaAndroid, "capacitor.settings.gradle");
const cartellaCopie = join(cartellaAndroid, "capacitor-libs");

if (!existsSync(fileImpostazioni)) {
  console.error("capacitor.settings.gradle non trovato: lancia prima `npx cap sync android`.");
  process.exit(1);
}

const originale = readFileSync(fileImpostazioni, "utf8");

// project(':nome').projectDir = new File('../node_modules/qualcosa')
const riga = /project\('(:[^']+)'\)\.projectDir = new File\('\.\.\/(node_modules\/[^']+)'\)/g;

const moduli = [...originale.matchAll(riga)].map((m) => ({
  nome: m[1].replace(/^:/, ""),
  percorso: m[2],
}));

if (moduli.length === 0) {
  console.log("Nessun modulo da copiare: capacitor.settings.gradle non punta a node_modules.");
  process.exit(0);
}

rmSync(cartellaCopie, { recursive: true, force: true });
mkdirSync(cartellaCopie, { recursive: true });

for (const modulo of moduli) {
  const sorgente = join(radice, modulo.percorso);
  if (!existsSync(sorgente)) {
    console.error(`Manca ${modulo.percorso}: lancia prima \`npm ci\`.`);
    process.exit(1);
  }
  // I test strumentati non servono alla build dell'app e portano dentro
  // dipendenze che l'app non usa.
  cpSync(sorgente, join(cartellaCopie, modulo.nome), {
    recursive: true,
    filter: (percorso) => !percorso.includes(`${"src"}/androidTest`) && !percorso.includes(`${"src"}/test`),
  });
  console.log(`copiato ${modulo.nome} da ${modulo.percorso}`);
}

const riscritto =
  "// GENERATO da scripts/vendor-capacitor-android.mjs dopo `cap sync`.\n" +
  "// Punta alle copie in android/capacitor-libs/, versionate nel repository,\n" +
  "// cosi il progetto si costruisce anche senza node_modules.\n" +
  moduli
    .map(
      (m) =>
        `include ':${m.nome}'\n` +
        `project(':${m.nome}').projectDir = new File(rootDir, 'capacitor-libs/${m.nome}')`,
    )
    .join("\n") +
  "\n";

writeFileSync(fileImpostazioni, riscritto, "utf8");
console.log("capacitor.settings.gradle riscritto sulle copie locali.");
