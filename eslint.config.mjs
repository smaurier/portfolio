import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import { harnais } from "./eslint/harnais.mjs";

const eslintConfig = defineConfig([
  ...nextVitals,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", ".scratch/**"]),
  ...harnais,
]);

export default eslintConfig;
