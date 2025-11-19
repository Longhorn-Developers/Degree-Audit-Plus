// Scrapes audit history from UT Direct and parses it into structured data

import type { DegreeAuditCardProps } from "./general-types";

const AUDIT_HISTORY_URL =
  "https://utdirect.utexas.edu/apps/degree/audits/submissions/history/";

function parseMajor(programText: string): string {
  // Clean up whitespace first (normalize spaces and newlines)
  const cleanText = programText.replace(/\s+/g, " ").trim();

  // Pattern 1: "B S in Communication and Leadership" (with "in")
  const withInMatch = cleanText.match(/B [SA] in (.+?)(?:\(|$)/);
  if (withInMatch) return withInMatch[1].trim();

  // Pattern 2: "B S Computer Science, CS" or "B A Economics"
  const spacedMatch = cleanText.match(/B [SA] (.+?)(?:,|\()/);
  if (spacedMatch) return spacedMatch[1].trim();

  // Pattern 3: "BSGS, Climate System Science" or "DEGREE_CODE, Major Name"
  // Handles degrees where code comes first, then major name after comma
  const codeFirstMatch = cleanText.match(/^[A-Z]+,\s*(.+?)(?:\(|$)/);
  if (codeFirstMatch) return codeFirstMatch[1].trim();

  // Fallback: first line
  return cleanText.split(" ")[0];
}

function parseCredential(programText: string): string | null {
  const match = programText.match(/- Credential:\s*(.+?)\s*\(/);
  return match ? match[1].trim() : null;
}

function parsePercentage(percentText: string): number {
  const match = percentText.trim().match(/(\d+)%/);
  return match ? parseInt(match[1], 10) : 0;
}

/**
 * Fetch and parse audit history from UT Direct
 */
export async function fetchAuditHistory(): Promise<DegreeAuditCardProps[]> {
  try {
    const response = await fetch(AUDIT_HISTORY_URL, {
      credentials: "include",
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const html = await response.text();
    // Parse HTML using DOMParser
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    // Find the audit history table
    const table = doc.querySelector("table");
    if (!table) {
      throw new Error("Audit history table not found");
    }

    // Get all table rows (skip header rows)
    const rows = Array.from(table.querySelectorAll("tbody tr"));

    const audits: DegreeAuditCardProps[] = [];
    const seenAudits = new Map<string, number>(); // Track unique audit combinations

    for (const row of rows) {
      try {
        const cells = row.querySelectorAll("td");
        if (cells.length < 8) continue; // Skip if not enough cells

        // Extract data from table cells
        const programCell = cells[3]; // Program column
        const auditIdCell = cells[6]; // Audit ID column (contains link)
        const percentCell = cells[7]; // Completion Percentage column

        if (!programCell || !percentCell) continue;

        const programText = programCell.textContent || "";
        const percentText = percentCell.textContent || "";

        // Extract audit ID from link
        const auditLink = auditIdCell.querySelector("a");
        const auditId = auditLink?.textContent?.trim() || "";

        console.log("Parsing row:", {
          programText: programText.substring(0, programText.length),
          percentText,
          auditId,
        });

        // Parse major, credential, and percentage
        const major = parseMajor(programText);
        const credential = parseCredential(programText);
        const percentage = parsePercentage(percentText);

        console.log("Parsed values:", { major, credential, percentage, auditId });

        // Create a unique key for this audit configuration
        const auditKey = `${major}-${credential || "none"}-${percentage}`;

        // Skip if we alr have this audit
        if (seenAudits.has(auditKey)) {
          console.log("Skipping duplicate audit:", auditKey);
          continue;
        }

        // Create audit entry
        const audit: DegreeAuditCardProps = {
          title: `Degree Audit ${audits.length + 1}`,
          majors: [major],
          minors: credential ? [credential] : [],
          percentage,
          auditId,
        };

        console.log("Created audit:", audit);
        audits.push(audit);
        seenAudits.set(auditKey, audits.length);
      } catch (rowError) {
        console.warn("Error parsing audit row:", rowError);
      }
    }

    console.log("Final audits array:", audits);

    if (audits.length === 0) {
      console.log("No audits found in history");
    }

    return audits;
  } catch (error) {
    console.error("Error fetching audit history:", error);
    throw error;
  }
}
