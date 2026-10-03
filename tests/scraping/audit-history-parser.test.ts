import { expect, test } from "bun:test";
import { JSDOM } from "jsdom";
import {
  findMergedAuditIds,
  parseAuditHistory,
} from "../../features/audit-scraping/audit-history-parser";

async function loadHistoryDocument(): Promise<Document> {
  const fixtureUrl = new URL(
    "../fixtures/scraping/audit-history.html",
    import.meta.url,
  );
  const html = await Bun.file(fixtureUrl).text();
  return new JSDOM(html).window.document;
}

test("folds matching reruns into one card per audit", async () => {
  const document = await loadHistoryDocument();
  const audits = parseAuditHistory(document);

  expect(
    audits.map((audit) => [audit.auditId, audit.majors, audit.percentage]),
  ).toEqual([
    ["100018587720", ["Computer Science"], 58],
    ["100018374967", ["Computer Science"], 61],
    ["100018347796", ["Civil Engineering"], 41],
    ["100018347783", ["Design"], 41],
  ]);
});

test("finds every rerun folded into a card", async () => {
  const document = await loadHistoryDocument();

  const merged = findMergedAuditIds(document, "100018587720");
  expect(merged).toHaveLength(18);
  expect(merged[0]).toBe("100018587720");
  expect(merged).toContain("100018587701");
  expect(merged).not.toContain("100018374967");

  // any rerun in the group finds the same group
  expect(findMergedAuditIds(document, "100018587719")).toEqual(merged);

  expect(findMergedAuditIds(document, "100018374967")).toEqual([
    "100018374967",
    "100018374966",
    "100018374965",
    "100018374964",
    "100018374963",
    "100018374962",
    "100018328171",
  ]);
  expect(findMergedAuditIds(document, "100018347796")).toEqual([
    "100018347796",
  ]);
});

test("finds nothing for an audit no longer on the page", async () => {
  const document = await loadHistoryDocument();
  expect(findMergedAuditIds(document, "999")).toEqual([]);
});
