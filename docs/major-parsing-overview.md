# Major Parsing Overview

This project normalizes degree-plan text into a clean major name before it is shown in the UI or used in audit history records. The parser lives in [`lib/backend/parse-major.ts`](/Users/spotta/Desktop/Projects/Degree-Audit-Plus/lib/backend/parse-major.ts).

## How It Works

The parser takes the raw degree-plan label and tries a few targeted patterns first:

1. Known special cases such as `Undergraduate - Undeclared`, `PharmD`, and `BSECE`
2. UT Direct formats like `B A, major ...`, `B S in ...`, and compact degree codes
3. Code-first strings like `BSGS, Climate System Science`
4. Fallback cleanup that removes degree prefixes, credentials, honors suffixes, and extra markers

When a pattern matches, the parser strips the noisy parts and returns the major name in a normalized form. The goal is to keep the logic narrow and predictable instead of trying to infer too much from every possible string.

## What The Parser Handles

- Dotted and spaced prefixes such as `B.A.`, `B S`, and `B F A`
- Compact degree labels such as `BSECE` and `BSCompSci`
- Honors, options, teaching tracks, and credential suffixes
- Special program names like `Informatics`, `Athletic Training`, and `Undeclared`

## Validation

The parser is covered by a fixture-based validator in [`tests/validate-parse-major.ts`](/Users/spotta/Desktop/Projects/Degree-Audit-Plus/tests/validate-parse-major.ts). That script runs the catalog examples plus real UT Direct degree-plan cases and writes the results to [`tests/parse-major-test-results.txt`](/Users/spotta/Desktop/Projects/Degree-Audit-Plus/tests/parse-major-test-results.txt).

The intent is to make regressions easy to spot while keeping the parser simple to maintain.
