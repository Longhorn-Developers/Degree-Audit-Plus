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
  const table = document.querySelector("table");
  if (!table) throw new Error("Audit history table not found");

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

export function parseAuditHistory(document: Document): AuditHistoryEntry[] {
  const audits: AuditHistoryEntry[] = [];
  const seenAudits = new Set<string>();

  for (const row of parseAuditHistoryRows(document)) {
    if (seenAudits.has(row.auditKey)) continue;

    audits.push({
      title: `Degree Audit ${audits.length + 1}`,
      majors: [row.major],
      minors: row.credential ? [row.credential] : [],
      percentage: row.percentage,
      auditId: row.auditId,
    });
    seenAudits.add(row.auditKey);
  }

  return audits;
}

// every ut row that parseAuditHistory folds into the same card as auditId
export function findMergedAuditIds(
  document: Document,
  auditId: string,
): string[] {
  const rows = parseAuditHistoryRows(document);
  const target = rows.find((row) => row.auditId === auditId);
  if (!target) return [];

  const auditIds: string[] = [];
  for (const row of rows) {
    if (row.auditId && row.auditKey === target.auditKey) {
      auditIds.push(row.auditId);
    }
  }
  return auditIds;
}
