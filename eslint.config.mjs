import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import { harnais } from "./eslint/harnais.mjs";

const eslintConfig = defineConfig([
  ...nextVitals,
  // `.netlify/**` ajoute le 04/11/2026 : `netlify build` y depose la sortie
  // du greffon Next (le gestionnaire de serveur, la fonction edge du proxy,
  // et tout le runtime Deno vendorise). eslint y trouvait 29 erreurs dans du
  // code genere qui n'est pas le notre, et le hook de pre-commit refusait de
  // commiter. Le dossier est deja dans .gitignore ; il manquait ici.
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", ".scratch/**", ".netlify/**"]),
  ...harnais,
]);

export default eslintConfig;
