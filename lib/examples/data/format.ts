import fs from "fs";
import path from "path";

// Read the departments.txt file
const filePath = path.join(__dirname, "departments.txt");
const fileContent = fs.readFileSync(filePath, "utf-8");

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

// Log for debugging
console.log("Department Map (First 5):", Object.entries(departmentMap).slice(0, 5));
console.log("Total Count:", Object.keys(departmentMap).length);

// output into structured map in a new file. 
const outputCode = `export const DEPARTMENT_MAP: Record<string, string> = ${JSON.stringify(departmentMap, null, 2)};`;
fs.writeFileSync(path.join(__dirname, "department-map.ts"), outputCode);

console.log("Generated department-map.ts successfully!");

export { departmentMap };
