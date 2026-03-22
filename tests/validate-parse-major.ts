import { mkdir, writeFile } from "node:fs/promises";
import { parseMajor } from "../lib/backend/parse-major";
import { utDegreeProgramCases } from "../lib/examples/data/ut-degree-programs";
import {
  fineArtsDegreePlanCases,
  engineeringDegreePlanCases,
  type ParseMajorFixtureCase,
  utDirectDegreePlanCases,
} from "./ut-direct-degree-plan-cases";

type ParseMajorCase = ParseMajorFixtureCase;

const regressionCases: ParseMajorCase[] = [
  { input: "B.F.A Design", expected: "Design", source: "Linear regression: dotted BFA format" },
  { input: "B.S. Computer Science", expected: "Computer Science", source: "Linear regression: dotted BS format" },
  { input: "B.A. Economics", expected: "Economics", source: "Linear regression: dotted BA format" },
  { input: "B S in Communication and Leadership", expected: "Communication and Leadership", source: "Linear regression: BA/BS with in" },
  { input: "BSGS, Climate System Science", expected: "Climate System Science", source: "Linear regression: code-first format" },
  { input: "  B   A   Design  ", expected: "Design", source: "Whitespace normalization" },
  { input: "Major: B A Design", expected: "Design", source: "Leading major label" },
  { input: "B A Design - Credential: Elements of Computing (completed)", expected: "Design", source: "Credential suffix delimiter" },
  { input: "BMusic Music performance (Students may major in voice)", expected: "Music performance", source: "Parenthetical suffix" },
];

const realisticAuditCases: ParseMajorCase[] = [
  { input: "Major: B A Design - Credential: Bridging Disciplines Program (active)", expected: "Design", source: "UT Direct-like major with credential" },
  { input: "BSCompSci Computer science - Credential: Applied Statistical Modeling (pending)", expected: "Computer science", source: "Compact degree code with credential" },
  { input: "BFA Studio art", expected: "Studio art", source: "Single-word first token after compact BFA prefix" },
  { input: "BSEnvirSci Geographical sciences", expected: "Geographical sciences", source: "Compact environmental science credential" },
];

const catalogCases: ParseMajorCase[] = utDegreeProgramCases.map((testCase) => ({
  input: `${testCase.degreeCode} ${testCase.label}`,
  expected: testCase.expected,
  source: "UT undergraduate catalog 2025-26",
}));

const allCases = [
  ...regressionCases,
  ...realisticAuditCases,
  ...utDirectDegreePlanCases,
  ...engineeringDegreePlanCases,
  ...fineArtsDegreePlanCases,
  ...catalogCases,
];

const results = allCases.map((testCase) => {
  const actual = parseMajor(testCase.input);
  return {
    ...testCase,
    actual,
    passed: actual === testCase.expected,
  };
});

const failures = results.filter((result) => !result.passed);
const outputLines = [
  "parseMajor validation results",
  "Source catalog: https://catalog.utexas.edu/undergraduate/the-university/degree-programs/",
  `Total cases: ${results.length}`,
  `Passed: ${results.length - failures.length}`,
  `Failed: ${failures.length}`,
  "",
  "Regression and realistic audit spot checks:",
  ...results
    .slice(
      0,
      regressionCases.length +
        realisticAuditCases.length +
        utDirectDegreePlanCases.length +
        engineeringDegreePlanCases.length +
        fineArtsDegreePlanCases.length,
    )
    .map(
      (result) =>
        `- ${result.passed ? "PASS" : "FAIL"} | ${result.input} -> ${result.actual} | expected: ${result.expected}`,
    ),
  "",
  "Catalog corpus failures:",
  ...(failures.length
    ? failures.map(
        (result) =>
          `- FAIL | ${result.input} -> ${result.actual} | expected: ${result.expected} | source: ${result.source}`,
      )
    : ["- None"]),
];

const outputPath = "tests/parse-major-test-results.txt";
await mkdir("tests", { recursive: true });
await writeFile(outputPath, `${outputLines.join("\n")}\n`, "utf8");

console.log(outputLines.join("\n"));
