import js from "@eslint/js";
import type { ESLint } from "eslint";
import pluginReact from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import { defineConfig } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

/**
 * Architecture boundaries (docs/architecture.md, "Dependency direction").
 * Every cross-boundary import uses the `@/` alias, so the graph is enforced
 * with import-specifier patterns — no resolver needed. Patterns use gitignore
 * semantics: exclusions are directory-level (`@/features/*`) so that `!`
 * negations can re-allow whole feature folders; `@/entrypoints/*` is
 * forbidden everywhere outside entrypoints.
 */
type RestrictedImportsRule = [
  "error",
  { patterns: { group: string[]; message: string }[] },
];

const boundary = (files: string[], forbidden: string[]) => ({
  files,
  rules: {
    "no-restricted-imports": [
      "error",
      {
        patterns: [
          {
            group: forbidden,
            message:
              "Import crosses an architecture boundary — see docs/architecture.md (Dependency direction).",
          },
        ],
      },
    ] satisfies RestrictedImportsRule as RestrictedImportsRule,
  },
});

const featureBoundary = (
  own: string,
  allowedFeatures: string[],
  extraForbidden: string[] = [],
) =>
  boundary(
    [`features/${own}/**`],
    [
      "@/features/*",
      `!@/features/${own}`,
      ...allowedFeatures.map((feature) => `!@/features/${feature}`),
      "@/entrypoints/*",
      ...extraForbidden,
    ],
  );

const architectureBoundaries = [
  boundary(
    ["domain/**"],
    ["@/features/*", "@/components/*", "@/lib/*", "@/entrypoints/*"],
  ),
  boundary(["lib/**"], ["@/features/*", "@/components/*", "@/entrypoints/*"]),
  boundary(["components/**"], ["@/features/*", "@/entrypoints/*"]),
  featureBoundary("catalog", [], ["@/components/*"]),
  featureBoundary("session", [], ["@/components/*"]),
  featureBoundary("preferences", []),
  featureBoundary("audit", ["preferences"]),
  featureBoundary("course-search", ["catalog", "audit"]),
  featureBoundary("dashboard", ["audit", "course-search", "preferences"]),
  featureBoundary("planner", ["audit", "course-search", "dashboard"]),
  featureBoundary("audit-scraping", ["audit", "session"], ["@/components/*"]),
  featureBoundary("popup", ["audit", "session"]),
  featureBoundary("banner", ["audit", "session"]),
];

export default defineConfig([
  { ignores: [".output/**", ".wxt/**"] },
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: { globals: globals.browser },
  },
  tseslint.configs.recommended,
  pluginReact.configs.flat.recommended,
  {
    plugins: { "react-hooks": reactHooks as unknown as ESLint.Plugin },
    rules: {
      "react/react-in-jsx-scope": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
  ...architectureBoundaries,
]);
