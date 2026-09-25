import type { AuditHistoryEntry } from "@/domain/audit";
import { parseMajor } from "./parse-major";

// Only used in this file so keep it here. 
export interface AuditHistoryRow {
  key: string;
  auditId: string | null;
  major: string;
  credential: string | null;
  percentage: number;
}

// Every row in page order without bs. 
export function parseAuditHistoryRows(document: Document): AuditHistoryRow[] {
  const table = document.querySelector("table");
  if (!table) throw new Error("Audit history table not found");

  const rows: AuditHistoryRow[] = [];
  for (const row of table.querySelectorAll("tbody tr")) {
    const cells = row.querySelectorAll("td");
    if (cells.length < 8) continue;

    const programText = cells[3].textContent ?? "";
    rows.push({
      key: [...cells].slice(0, 6).map(cellText).join("|"),
      auditId: cells[6].querySelector("a")?.textContent?.trim() ?? null,
      major: parseMajor(programText),
      credential: parseCredential(programText),
      percentage: parsePercentage(cells[7].textContent ?? ""),
    });
  }
  return rows;
}

// The list the UI shows: one entry per program+percentage, first row wins.
export function toAuditHistoryEntries(
  rows: AuditHistoryRow[],
): AuditHistoryEntry[] {
  const audits: AuditHistoryEntry[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    const auditKey = `${row.major}-${row.credential ?? "none"}-${row.percentage}`;
    if (seen.has(auditKey)) continue;
    seen.add(auditKey);
    audits.push({
      title: `Degree Audit ${audits.length + 1}`,
      majors: [row.major],
      minors: row.credential ? [row.credential] : [],
      percentage: row.percentage,
      // "" keeps hasAuditResult reading a linkless row as "still generating"
      auditId: row.auditId ?? "",
    });
  }
  return audits;
}

export function parseAuditHistory(document: Document): AuditHistoryEntry[] {
  return toAuditHistoryEntries(parseAuditHistoryRows(document));
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
