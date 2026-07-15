import type { AuditHistoryEntry } from "@/domain/audit";
import { parseMajor } from "./parse-major";

function parseCredential(programText: string): string | null {
  return programText.match(/- Credential:\s*(.+?)\s*\(/)?.[1].trim() ?? null;
}

function parsePercentage(percentText: string): number {
  return Number.parseInt(percentText.match(/(\d+)%/)?.[1] ?? "0", 10);
}

export function parseAuditHistory(document: Document): AuditHistoryEntry[] {
  const table = document.querySelector("table");
  if (!table) throw new Error("Audit history table not found");

  const audits: AuditHistoryEntry[] = [];
  const seenAudits = new Set<string>();

  for (const row of table.querySelectorAll("tbody tr")) {
    const cells = row.querySelectorAll("td");
    if (cells.length < 8) continue;

    const programText = cells[3].textContent ?? "";
    const auditId = cells[6].querySelector("a")?.textContent?.trim() ?? "";
    const major = parseMajor(programText);
    const credential = parseCredential(programText);
    const percentage = parsePercentage(cells[7].textContent ?? "");
    const auditKey = `${major}-${credential ?? "none"}-${percentage}`;
    if (seenAudits.has(auditKey)) continue;

    audits.push({
      title: `Degree Audit ${audits.length + 1}`,
      majors: [major],
      minors: credential ? [credential] : [],
      percentage,
      auditId,
    });
    seenAudits.add(auditKey);
  }

  return audits;
}
