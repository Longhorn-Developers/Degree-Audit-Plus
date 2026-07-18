import { describe, expect, test } from "bun:test";
import {
  isCoreSection,
  isCreditSection,
  isGpaSection,
  parseGpaSummary,
} from "../../features/audit/audit-calculations";

describe("section predicates", () => {
  test("classify by case-insensitive title substring", () => {
    expect(isCoreSection("Core Curriculum")).toBe(true);
    expect(isCoreSection("core (020)")).toBe(true);
    expect(isCoreSection("GPA Totals")).toBe(false);

    expect(isCreditSection("Credit Hour Totals")).toBe(true);
    expect(isCreditSection("credit")).toBe(true);
    expect(isCreditSection("Core Curriculum")).toBe(false);

    expect(isGpaSection("GPA Totals")).toBe(true);
    expect(isGpaSection("gpa")).toBe(true);
    expect(isGpaSection("Credit Hour Totals")).toBe(false);
  });
});

describe("parseGpaSummary", () => {
  test("extracts hours and points from a matching sentence", () => {
    expect(
      parseGpaSummary("80 hours for a total of 320 points were used."),
    ).toEqual({ hoursUsed: 80, points: 320 });
  });

  test("parses decimal figures", () => {
    expect(
      parseGpaSummary("A total of 12.5 hours and 41.25 points counted."),
    ).toEqual({ hoursUsed: 12.5, points: 41.25 });
  });

  test("is case-insensitive and tolerates text between the figures", () => {
    expect(
      parseGpaSummary("Used 90 HOURS in the calc for a grand total of 360 POINTS"),
    ).toEqual({ hoursUsed: 90, points: 360 });
  });

  test("returns null for real scraped GPA text that carries no hours/points", () => {
    // Verbatim from the audit-scraper snapshot's "GPA Totals" rule.
    expect(
      parseGpaSummary(
        "Students must earn a grade point average of 2.0 in all mathematics and science courses required by the degree.",
      ),
    ).toBeNull();
  });

  test("returns null when the points figure is missing", () => {
    expect(parseGpaSummary("80 hours were counted.")).toBeNull();
  });

  test("returns null for undefined or empty text", () => {
    expect(parseGpaSummary(undefined)).toBeNull();
    expect(parseGpaSummary("")).toBeNull();
  });
});
