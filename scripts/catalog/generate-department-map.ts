import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const fileContent = await readFile(
  fileURLToPath(new URL("departments.txt", import.meta.url)),
  "utf8",
);

/**
 * Creates a mapping of department code to its full name.
 * Format: { "A I": "Artificial Intelligence", "C S": "Computer Science", ... }
 */
const departmentMap: Record<string, string> = {};

// Regex to capture value and the text inside the <option> tag
// Handles cases like <option value="PIA" selected>PIA - Piano</option>
const regex = /value="([^"]+)"[^>]*>([^<]+)<\/option>/g;
let match;

while ((match = regex.exec(fileContent)) !== null) {
  const code = match[1];
  const fullLabel = match[2];

  // Extract name after "CODE - " if present, else use full label
  // e.g., "A I - Artificial Intelligence" -> "Artificial Intelligence"
  const name = fullLabel.includes(" - ")
    ? fullLabel.split(" - ")[1].trim()
    : fullLabel.trim();

  departmentMap[code] = name;
}

const outputCode = `export const DEPARTMENT_MAP: Record<string, string> = ${JSON.stringify(departmentMap, null, 2)};`;
await writeFile(
  fileURLToPath(
    new URL("../../features/catalog/department-map.ts", import.meta.url),
  ),
  `${outputCode}\n`,
);

console.log(`Generated ${Object.keys(departmentMap).length} departments.`);
