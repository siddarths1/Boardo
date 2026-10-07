import { defineConfig, globalIgnores } from "eslint/config";
import next from "eslint-config-next/core-web-vitals";
import ts from "eslint-config-next/typescript";
export default defineConfig([...next, ...ts, {
  rules: {
    "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    "react-hooks/set-state-in-effect": "off",
  }
}, globalIgnores([".next/**", "node_modules/**", "audit-*.cjs", "test-results/**", "playwright-report/**"])]);
