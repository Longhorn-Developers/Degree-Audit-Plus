import { expect, test } from "bun:test";
import { JSDOM } from "jsdom";
import {
  findCardId,
  findDedupedAuditIds,
  findNewRowKey,
  parseAuditHistory,
  type AuditHistoryRow,
} from "../../features/audit-scraping/audit-history-parser";

async function loadHistoryDocument(): Promise<Document> {
  const fixtureUrl = new URL(
    "../fixtures/scraping/audit-history.html",
    import.meta.url,
  );
  const html = await Bun.file(fixtureUrl).text();
  return new JSDOM(html).window.document;
}

test("folds matching reruns into one card per audit, keeping the oldest run", async () => {
  const document = await loadHistoryDocument();
  const audits = parseAuditHistory(document);

  expect(
    audits.map((audit) => [audit.auditId, audit.majors, audit.percentage]),
  ).toEqual([
    ["100018587701", ["Computer Science"], 58],
    ["100018347796", ["Civil Engineering"], 41],
    ["100018347783", ["Design"], 41],
    ["100018328171", ["Computer Science"], 61],
  ]);
});

test("a pending run gets no number so finished titles never shift", () => {
  const row = (id: string, program: string, percent: string) =>
    `<tr>${"<td></td>".repeat(3)}<td>${program}</td><td></td><td></td>` +
    `<td>${id ? `<a>${id}</a>` : ""}</td><td>${percent}</td></tr>`;
  const html =
    "<table><tbody>" +
    row("", "Major: Computer Science", "") +
    row("2", "Major: Computer Science", "58%") +
    row("1", "Major: Design", "41%") +
    "</tbody></table>";
  const audits = parseAuditHistory(new JSDOM(html).window.document);

  expect(audits.map((audit) => [audit.auditId, audit.title])).toEqual([
    ["", undefined],
    ["2", "Degree Audit 1"],
    ["1", "Degree Audit 2"],
  ]);
});

test("finds every rerun folded into a card", async () => {
  const document = await loadHistoryDocument();

  const merged = findDedupedAuditIds(document, "100018587720");
  expect(merged).toHaveLength(18);
  expect(merged[0]).toBe("100018587720");
  expect(merged).toContain("100018587701");
  expect(merged).not.toContain("100018374967");

  // any rerun in the group finds the same group
  expect(findDedupedAuditIds(document, "100018587719")).toEqual(merged);

  expect(findDedupedAuditIds(document, "100018374967")).toEqual([
    "100018374967",
    "100018374966",
    "100018374965",
    "100018374964",
    "100018374963",
    "100018374962",
    "100018328171",
  ]);
  expect(findDedupedAuditIds(document, "100018347796")).toEqual([
    "100018347796",
  ]);
});

test("finds nothing for an audit no longer on the page", async () => {
  const document = await loadHistoryDocument();
  expect(findDedupedAuditIds(document, "999")).toEqual([]);
});

test("reads the degree plan and catalog year off each row's Rerun link", () => {
  const row = (id: string, program: string, rerun: string) =>
    `<tr><td>${rerun}</td>${"<td></td>".repeat(2)}<td>${program}</td>` +
    `<td></td><td></td><td><a>${id}</a></td><td>50%</td></tr>`;
  const link = (plan: string, secondary = "") =>
    `<a href="/apps/degree/audits/requests/student_individual/?form-0-begin_ccyy=2026` +
    `&amp;form-0-degree_plan=${plan}&amp;form-0-secondary_deg_pln=${secondary}&amp;rerun=">Rerun</a>`;
  const html =
    "<table><tbody>" +
    row("3", "Major: Computer Science", link("ESC SS CS")) +
    row("2", "Major: Design", link("FADES", "MINOR")) +
    row("1", "Major: Biology", "") +
    "</tbody></table>";
  const audits = parseAuditHistory(new JSDOM(html).window.document);

  expect(audits.map((audit) => [audit.auditId, audit.degree])).toEqual([
    ["3", { degreePlan: "ESC SS CS", catalogYear: "2026" }],
    ["2", undefined],
    ["1", undefined],
  ]);
});

test("finds a new run even when it repeats an earlier row's key", () => {
  const row = (key: string, auditId: string | null) =>
    ({ key, auditId }) as AuditHistoryRow;
  const before = [row("CS 4:34 PM", "2"), row("AADS 4:30 PM", "1")];

  // same degree, same minute: only the count tells them apart
  const after = [row("CS 4:34 PM", null), ...before];
  expect(findNewRowKey(before, after)).toBe("CS 4:34 PM");
  expect(findNewRowKey(before, before)).toBeUndefined();
});

test("a rerun that folds into an older card gets that card's id", () => {
  const row = (auditId: string, major: string, percentage: number) =>
    ({
      key: auditId,
      auditId,
      major,
      credential: null,
      percentage,
    }) as AuditHistoryRow;
  const rows = [
    row("3", "Computer Science", 45),
    row("2", "Computer Science", 47),
    row("1", "Computer Science", 45),
  ];

  expect(findCardId(rows, "3")).toBe("1");
  expect(findCardId(rows, "2")).toBe("2");
});
