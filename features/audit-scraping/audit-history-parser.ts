import type { AuditHistoryEntry } from "@/domain/audit";
import { parseMajor } from "./parse-major";

// One history row. `key` identifies it before the result link exists;
// the runner and the sync code both read it.
export interface AuditHistoryRow {
  key: string;
  auditId: string | null;
  major: string;
  credential: string | null;
  percentage: number;
}

// Every row in page order without bs. UT drops the table when the student has
// no audits.
export function parseAuditHistoryRows(document: Document): AuditHistoryRow[] {
  const table = document.querySelector("table");
  if (!table) return [];

  const rows: AuditHistoryRow[] = [];
  for (const row of table.querySelectorAll("tbody tr")) {
    const cells = row.querySelectorAll("td");
    if (cells.length < 8) continue;

    const programText = cells[3].textContent ?? "";
    rows.push({
      // Columns: Rerun, Created, Type, Program, Requested, Status, Id, %.
      // Status flips Processing → Completed, so the key stops before it.
      key: [...cells].slice(0, 5).map(cellText).join("|"),
      auditId: cells[6].querySelector("a")?.textContent?.trim() ?? null,
      major: parseMajor(programText),
      credential: parseCredential(programText),
      percentage: parsePercentage(cells[7].textContent ?? ""),
    });
  }
  return rows;
}

// The list the UI shows: one card per major+credential+percentage. UT lists
// newest first; each card keeps its oldest run so a duplicate rerun never
// changes its id or position.
export function toAuditHistoryEntries(
  rows: AuditHistoryRow[],
): AuditHistoryEntry[] {
  const cards: AuditHistoryRow[] = [];
  const seen = new Set<string>();
  for (const row of [...rows].reverse()) {
    const key = cardKey(row);
    if (seen.has(key)) continue;
    seen.add(key);
    cards.unshift(row);
  }

  // only finished audits are numbered so a pending run can't shift titles
  let finished = 0;
  return cards.map((row) => ({
    title: row.auditId ? `Degree Audit ${++finished}` : undefined,
    majors: [row.major],
    minors: row.credential ? [row.credential] : [],
    percentage: row.percentage,
    // "" keeps hasAuditResult reading a linkless row as "still generating"
    auditId: row.auditId ?? "",
  }));
}

export function parseAuditHistory(document: Document): AuditHistoryEntry[] {
  return toAuditHistoryEntries(parseAuditHistoryRows(document));
}

// Given a card's id, returns every run folded into that card, so deleting a
// card deletes all its reruns on UT.
export function findDedupedAuditIds(
  document: Document,
  auditId: string,
): string[] {
  const rows = parseAuditHistoryRows(document);
  const target = rows.find((row) => row.auditId === auditId);
  if (!target) return [];
  return rows
    .filter((row) => row.auditId && cardKey(row) === cardKey(target))
    .map((row) => row.auditId as string);
}

// Rows with the same major, credential and percentage fold into one card.
function cardKey(row: AuditHistoryRow): string {
  return `${row.major}-${row.credential ?? "none"}-${row.percentage}`;
}

function parseCredential(programText: string): string | null {
  return programText.match(/- Credential:\s*(.+?)\s*\(/)?.[1].trim() ?? null;
}

function parsePercentage(percentText: string): number {
  return Number.parseInt(percentText.match(/(\d+)%/)?.[1] ?? "0", 10);
}

function cellText(cell: Element): string {
  return cell.textContent?.replace(/\s+/g, " ").trim() ?? "";
}
