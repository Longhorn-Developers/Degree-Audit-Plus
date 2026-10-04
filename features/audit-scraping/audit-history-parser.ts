import type { AuditHistoryEntry } from "@/domain/audit";
import { parseMajor } from "./parse-major";

function parseCredential(programText: string): string | null {
  return programText.match(/- Credential:\s*(.+?)\s*\(/)?.[1].trim() ?? null;
}

function parsePercentage(percentText: string): number {
  return Number.parseInt(percentText.match(/(\d+)%/)?.[1] ?? "0", 10);
}

interface AuditHistoryRow {
  auditId: string;
  major: string;
  credential: string | null;
  percentage: number;
  auditKey: string;
}

function parseAuditHistoryRows(document: Document): AuditHistoryRow[] {
  // ut drops the table when the student has no audits
  const table = document.querySelector("table");
  if (!table) return [];

  const rows: AuditHistoryRow[] = [];

  for (const row of table.querySelectorAll("tbody tr")) {
    const cells = row.querySelectorAll("td");
    if (cells.length < 8) continue;

    const programText = cells[3].textContent ?? "";
    const auditId = cells[6].querySelector("a")?.textContent?.trim() ?? "";
    const major = parseMajor(programText);
    const credential = parseCredential(programText);
    const percentage = parsePercentage(cells[7].textContent ?? "");
    const auditKey = `${major}-${credential ?? "none"}-${percentage}`;

    rows.push({ auditId, major, credential, percentage, auditKey });
  }

  return rows;
}

// One card per major+credential+percentage. UT lists newest first; each card
// keeps its oldest run so a duplicate rerun never changes its id or position.
export function parseAuditHistory(document: Document): AuditHistoryEntry[] {
  const cards: AuditHistoryRow[] = [];
  const seenAudits = new Set<string>();
  for (const row of parseAuditHistoryRows(document).reverse()) {
    if (seenAudits.has(row.auditKey)) continue;
    seenAudits.add(row.auditKey);
    cards.unshift(row);
  }

  // only finished audits are numbered so a pending run can't shift titles
  let finished = 0;
  return cards.map((row) => ({
    title: row.auditId ? `Degree Audit ${++finished}` : undefined,
    majors: [row.major],
    minors: row.credential ? [row.credential] : [],
    percentage: row.percentage,
    auditId: row.auditId,
  }));
}

// Given a card's id, returns every run folded into that card, so deleting a
// card deletes all its reruns on UT.
export function findDedupedAuditIds(
  document: Document,
  auditId: string,
): string[] {
  const rows = parseAuditHistoryRows(document);
  const key = rows.find((row) => row.auditId === auditId)?.auditKey;
  return rows
    .filter((row) => row.auditId && row.auditKey === key)
    .map((row) => row.auditId);
}
