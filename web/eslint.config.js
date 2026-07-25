import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      // eslint-plugin-react-hooks v7 (bump 25 jul 2026, ver npm audit) cambió
      // su config "recommended" para incluir por defecto todas las reglas
      // orientadas a React Compiler (set-state-in-effect, purity,
      // preserve-manual-memoization, etc.) — Neggo no usa React Compiler, y
      // adoptar esas reglas de golpe generó 63 errores nuevos en componentes
      // que no tienen nada que ver con el bump de seguridad. Se fijan acá
      // explícitamente solo las dos reglas clásicas que este proyecto ya
      // usaba (mismo comportamiento que la v5 anterior), para no expandir el
      // alcance de un fix de vulnerabilidad a un rediseño de linting.
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
);
