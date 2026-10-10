import { defineConfig, type OxlintOverride } from "oxlint";

/**
 * Architecture boundaries (docs/architecture.md, "Dependency direction").
 * Every cross-boundary import uses the `@/` alias, so the graph is enforced
 * with import-specifier patterns — no resolver needed. Patterns use gitignore
 * semantics: exclusions are recursive (`@/features/**`) so that `!`
 * negations can re-allow whole feature folders; `@/entrypoints/**` is
 * forbidden everywhere outside entrypoints.
 */
const boundary = (files: string[], forbidden: string[]): OxlintOverride => ({
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
    ],
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
      "@/features/**",
      ...[own, ...allowedFeatures].flatMap((feature) => [
        `!@/features/${feature}`,
        `!@/features/${feature}/**`,
      ]),
      "@/entrypoints/**",
      ...extraForbidden,
    ],
  );

export default defineConfig({
  plugins: ["typescript", "react"],
  env: { browser: true },
  ignorePatterns: [".output/**", ".wxt/**"],
  rules: {
    "no-unused-vars": [
      "error",
      { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
    ],
    "typescript/no-explicit-any": "warn",
    "react/rules-of-hooks": "error",
    "react/exhaustive-deps": "warn",
    "react/globals": "off",
    "react/set-state-in-effect": "off",
  },
  overrides: [
    boundary(
      ["domain/**"],
      ["@/features/**", "@/components/**", "@/lib/**", "@/entrypoints/**"],
    ),
    boundary(
      ["lib/**"],
      ["@/features/**", "@/components/**", "@/entrypoints/**"],
    ),
    boundary(["components/**"], ["@/features/**", "@/entrypoints/**"]),
    featureBoundary("catalog", [], ["@/components/**"]),
    featureBoundary("session", [], ["@/components/**"]),
    featureBoundary("preferences", []),
    featureBoundary("audit", ["preferences"]),
    featureBoundary("course-search", ["catalog", "audit"]),
    featureBoundary("dashboard", ["audit", "course-search", "preferences"]),
    featureBoundary("planner", ["audit", "course-search", "dashboard"]),
    featureBoundary(
      "audit-scraping",
      ["audit", "session"],
      ["@/components/**"],
    ),
    featureBoundary("popup", ["audit", "session"]),
    featureBoundary("banner", ["audit", "session"]),
  ],
});
