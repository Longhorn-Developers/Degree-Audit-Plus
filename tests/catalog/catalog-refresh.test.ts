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

type CatalogRequest = { url: string; cookie: string | null };

async function catalogFetch(
  failingDepartment?: string,
  requests: CatalogRequest[] = [],
): Promise<typeof fetch> {
  const results = await fixture("catalog-results.html");
  const details = await fixture("catalog-course-details.html");

  return (async (input, init) => {
    const url = String(input);
    requests.push({ url, cookie: new Headers(init?.headers).get("cookie") });
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

  test("sends the session cookie with every request", async () => {
    const requests: CatalogRequest[] = [];
    await fetchAndScrapeCourses(
      "20259",
      "C S",
      "U",
      await catalogFetch(undefined, requests),
      0,
      "sessionid=test",
    );

    expect(requests.length).toBeGreaterThan(1);
    expect(requests.every(({ cookie }) => cookie === "sessionid=test")).toBe(
      true,
    );
  });

  test("follows next page links until there are none", async () => {
    const results = await fixture("catalog-results.html");
    const details = await fixture("catalog-course-details.html");
    const firstPage = results.replace(
      "<table",
      '<a id="next_nav_link" href="?fos_fl=C%20S&level=U&search_type_main=FIELD&next_unique=99999">Next page</a><table',
    );
    const urls: string[] = [];
    const fetchImpl = (async (input) => {
      const url = String(input);
      urls.push(url);
      if (!url.includes("/results/")) return new Response(details);
      return new Response(url.includes("next_unique") ? results : firstPage);
    }) as typeof fetch;

    const courses = await fetchAndScrapeCourses(
      "20259",
      "C S",
      "U",
      fetchImpl,
      0,
    );

    expect(urls.filter((url) => url.includes("/results/"))).toHaveLength(2);
    expect(courses).toHaveLength(8);
  });

  test("stops at once when UT redirects to the login page", async () => {
    const directory = await mkdtemp(join(tmpdir(), "dap-catalog-"));
    const outputPath = join(directory, "catalog.json");
    await writeFile(outputPath, "original");
    let requestCount = 0;
    const fetchImpl = (async () => {
      requestCount++;
      return new Response(null, {
        status: 302,
        headers: {
          location: "https://enterprise.login.utexas.edu/idp/profile/SAML2",
        },
      });
    }) as unknown as typeof fetch;

    try {
      await expect(
        refreshCatalog({
          semester: "20259",
          departments: ["C S", "M"],
          outputPath,
          fetchImpl,
          descriptionDelayMs: 0,
        }),
      ).rejects.toThrow("Not logged in / session expired");
      expect(requestCount).toBe(1);
      expect(await readFile(outputPath, "utf8")).toBe("original");
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  test("does not treat a login page as a missing description", async () => {
    const results = await fixture("catalog-results.html");
    const fetchImpl = (async (input) =>
      new Response(
        String(input).includes("/results/")
          ? results
          : '<form action="/login"><input type="password"></form>',
      )) as typeof fetch;

    await expect(
      fetchAndScrapeCourses("20259", "C S", "U", fetchImpl, 0),
    ).rejects.toThrow("Not logged in / session expired");
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
