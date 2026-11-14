import js from "@eslint/js";
import tseslint from "typescript-eslint";
import astro from "eslint-plugin-astro";
import { globalIgnores } from "eslint/config";

export default [
  globalIgnores([
    "dist/**",
    ".astro/**",
    "node_modules/**",
    ".wrangler/**",
    "playwright-report/**",
    "test-results/**",
    "coverage/**",
  ]),

  {
    files: ["**/*.{js,mjs,cjs}"],
    ...js.configs.recommended,
  },

  ...tseslint.configs.recommended,
  ...astro.configs.recommended,
];
