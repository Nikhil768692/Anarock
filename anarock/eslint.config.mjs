import nextVitals from "eslint-config-next/core-web-vitals";
import { defineConfig, globalIgnores } from "eslint/config";

// Next.js 16 uses ESLint's flat config. Same rules as before
// ("next/core-web-vitals"); `npm run lint` runs it.
export default defineConfig([
  ...nextVitals,
  {
    // New React Compiler checks added in this ESLint plugin version. The site
    // does not use the React Compiler, so they are shown as warnings to fix
    // over time rather than errors.
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "node_modules/**"]),
]);
