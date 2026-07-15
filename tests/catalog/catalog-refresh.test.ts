import { describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  fetchAndScrapeCourses,
  refreshCatalog,
} from "../../scripts/catalog/refresh-catalog";
import { validateCatalog } from "../../scripts/catalog/validate-catalog";

async function fixture(name: string) {
  return Bun.file(
    new URL(`../fixtures/scraping/${name}`, import.meta.url),
  ).text();
}

async function catalogFetch(failingDepartment?: string): Promise<typeof fetch> {
  const results = await fixture("catalog-results.html");
  const details = await fixture("catalog-course-details.html");

  return (async (input) => {
    const url = String(input);
    if (
      failingDepartment &&
      url.includes(`fos_fl=${encodeURIComponent(failingDepartment)}`)
    ) {
      return new Response("failure", { status: 500, statusText: "Failed" });
    }
    return new Response(url.includes("/results/") ? results : details);
  }) as typeof fetch;
}

describe("catalog refresh", () => {
  test("fetches results and detail descriptions", async () => {
    const courses = await fetchAndScrapeCourses(
      "20259",
      "C S",
      "U",
      await catalogFetch(),
      0,
    );

    expect(courses).toHaveLength(4);
    expect(courses[0].description.length).toBeGreaterThan(0);
    expect(courses.at(-1)?.status).toBe("CANCELLED");
  });

  test("validates and atomically writes a successful refresh", async () => {
    const directory = await mkdtemp(join(tmpdir(), "dap-catalog-"));
    const outputPath = join(directory, "catalog.json");

    try {
      const courses = await refreshCatalog({
        semester: "20259",
        departments: ["C S"],
        outputPath,
        fetchImpl: await catalogFetch(),
        descriptionDelayMs: 0,
      });
      const written: unknown = JSON.parse(await readFile(outputPath, "utf8"));

      validateCatalog(written, "20259");
      expect(written).toEqual(courses);
      expect(await Bun.file(`${outputPath}.tmp`).exists()).toBe(false);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  test("does not replace output when a department fails", async () => {
    const directory = await mkdtemp(join(tmpdir(), "dap-catalog-"));
    const outputPath = join(directory, "catalog.json");
    await writeFile(outputPath, "original");

    try {
      await expect(
        refreshCatalog({
          semester: "20259",
          departments: ["C S", "BAD"],
          outputPath,
          fetchImpl: await catalogFetch("BAD"),
          descriptionDelayMs: 0,
        }),
      ).rejects.toThrow("BAD/L");
      expect(await readFile(outputPath, "utf8")).toBe("original");
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
