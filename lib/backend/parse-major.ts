const MAJOR_TERMINATOR = String.raw`(?:\s+-\s+Credential:|\(|$)`;
const BSBA_PREFIX = /B\.?\s*[SA]\.?(?=[\s,])\s*/;
const GENERIC_BACHELOR_PREFIX =
  /^(?:B[A-Za-z&]+|B(?:\.?\s*[A-Z&])+\.?|PharmD)(?:\s+|,\s*)/i;
const ENTRY_LEVEL_PREFIX = /^ENTRY-LEVEL requirements(?:\s+for|,\s*)\s*(.+)$/i;

function stripKnownSuffixes(candidate: string): string {
  const normalizedCandidate = candidate.trim();

  const specializedPatterns: Array<[RegExp, string]> = [
    [
      /^(Biology),\s*(?:Cell and Molecular Biology|Computational Biology|Ecology, Evolution,? ?& Behavior|Genetics and Genomics|Human Biology|Microbiology and Infectious Diseases|Marine Sci\.?|Plant Biology)$/i,
      "$1",
    ],
    [
      /^(Biology),\s*(?:Ecol, Evol, and Biodiversity Concentration|Ecol, Evol, and Biodiversity Honors|Organismal Biology and Physiology Concentration|Organismal Biology and Physiology Honors)$/i,
      "$1",
    ],
    [
      /^(Environmental Science),\s*(?:Biological Sciences|Bio Science Honors)$/i,
      "$1",
    ],
    [
      /^(Nutrition),\s*(?:Dietetics.*|Nutritional Sciences Option|Nutrition and Public Health)$/i,
      "$1",
    ],
    [
      /^(Physics),\s*(?:Biophysics|Radiation Physics option|Computation option|Space Sciences option)$/i,
      "$1",
    ],
    [/^(Mathematics),\s*Actuarial Science option$/i, "$1"],
    [/^(Neuroscience),\s*Neuroscience Scholars$/i, "$1"],
    [/^(Aerospace Engineering),\s*(?:Atmospheric Flight|Space Flight)$/i, "$1"],
    [/^(Biomedical Engineering),\s*[IVX]+:\s*.+$/i, "$1"],
    [/^(Chemical Engr),\s*.+$/i, "$1"],
    [/^(Chem Engr)(?:\s+I:.*|,\s*I:.*)$/i, "$1"],
    [/^(Mech Engr),\s*(?:Career Gateway Elective|\*)$/i, "$1"],
    [/^(Music);\s*Emphasis in (?:Composition|Music),\s*.+$/i, "$1"],
    [
      /^(Theatre and Dance),\s*(?:Dance|Design and Tech|His, Lit, and Drama|Playwriting and Directing|Performer'?s Process|Theatre for Youth and Communities)$/i,
      "$1",
    ],
    [/^(Dance),\s*Dance(?: Education)? Option$/i, "$1"],
    [/^(?:in\s+)?(Informatics)(?:;\s*.+)?$/i, "$1"],
    [/^ED,\s*Generic All-Level Special Education$/i, "Education"],
    [/^ED,\s*EC-6 ESL Bilingual Generalist Certification$/i, "Education"],
    [/^ED,\s*EC-6 ESL Generalist Certification$/i, "Education"],
    [/^ED,\s*YCS\b.*$/i, "Youth and community studies"],
    [/^Athletic Training(?:\s+with\s+.+)?$/i, "Athletic training"],
    [/^KHE,\s*AMS\b.*$/i, "Applied movement science"],
    [/^KHE,\s*ES\b.*$/i, "Exercise science"],
    [/^KHE,\s*HPBS\b.*$/i, "Health promotion and behavioral science"],
    [/^KHE,\s*PCSS\b.*$/i, "Physical culture and sports studies"],
    [/^KHE,\s*SM\b.*$/i, "Sport management"],
    [/^Asian Cultrs\s*&\s*Langs(?:,\s*.+)?$/i, "Asian cultures and languages"],
    [/^(Composition),\s*Traditional,\s*.+$/i, "$1"],
    [/^(Jazz),\s*.+$/i, "$1"],
    [/^(Music Studies),\s*(?:Choral|Instrumental),\s*.+$/i, "$1"],
    [/^(Orch\. Instrument),\s*Traditional,\s*.+$/i, "$1"],
    [/^(Human Development and Family Sciences),\s*Honors$/i, "$1"],
    [
      /^(HDFS),\s*Human Development and Family Sciences$/i,
      "Human Development and Family Sciences",
    ],
    [
      /^(HDFS),\s*Honors(?: in Advanced HDFS)?$/i,
      "Human Development and Family Sciences",
    ],
    [/^(Public Health);\s*Public Health Honors$/i, "Public Health"],
  ];

  for (const [pattern, replacement] of specializedPatterns) {
    if (pattern.test(normalizedCandidate)) {
      return normalizedCandidate.replace(pattern, replacement).trim();
    }
  }

  return normalizedCandidate
    .replace(
      /,\s*(?:Honors?|Option\b.*|Teaching\b.*|Focus Area\b.*|Integrated Program\b.*|Turing Scholars\b.*|Advanced Program\b.*|Entry-Level\b.*|CS(?:\s*&\s*Business)?\b.*)$/i,
      "",
    )
    .replace(/;\s*Public Health Honors$/i, "")
    .replace(/[,\s]*\*+\s*$/g, "")
    .replace(/[,\s]+$/g, "")
    .trim();
}

function cleanExtractedMajor(raw: string): string {
  return stripKnownSuffixes(
    raw
      .replace(/^\s*[:,-]+\s*/g, "")
      .replace(/^\s*major(?:\s+in)?\s*[:,-]?\s*/i, "")
      .replace(/,\s*[A-Z][A-Z0-9&/\s-]*$/g, "")
      .replace(/\*+\s*INCOMPLETE\s*\*?$/i, "")
      .replace(/\s*\*+\s*$/g, "")
      .trim(),
  );
}

function stripDegreePrefix(programText: string): string {
  return programText
    .replace(GENERIC_BACHELOR_PREFIX, "")
    .replace(/^in\s+/i, "")
    .trim();
}

export function parseMajor(programText: string): string {
  const cleanText = programText.replace(/\s+/g, " ").trim();
  if (!cleanText) return "";

  const bachelorOfMatch = cleanText.match(/^Bachelor of\s+(.+?)(?:\s+-\s+|$)/i);
  if (bachelorOfMatch) {
    return cleanExtractedMajor(bachelorOfMatch[1]);
  }

  if (/^Undergraduate\s*-\s*Undeclared$/i.test(cleanText)) {
    return "Undeclared";
  }

  if (/^PharmD(?:,|$)/i.test(cleanText)) {
    return "Pharmacy";
  }

  if (/^BSECE(?::|,|\(|$)/i.test(cleanText)) {
    return "Electrical and Computer Engr";
  }

  const undeclaredMatch = cleanText.match(/\*\s*([^*]+?)\s*\*\s*Incomplete\b/i);
  if (undeclaredMatch) return cleanExtractedMajor(undeclaredMatch[1]);

  const entryLevelMatch = cleanText.match(ENTRY_LEVEL_PREFIX);
  if (entryLevelMatch) return cleanExtractedMajor(entryLevelMatch[1]);

  const explicitMajorMatch = cleanText.match(
    new RegExp(
      `${BSBA_PREFIX.source},?\\s*major\\s+(.+?)${MAJOR_TERMINATOR}`,
      "i",
    ),
  );
  if (explicitMajorMatch) return cleanExtractedMajor(explicitMajorMatch[1]);

  // Pattern 1: "B S in Communication and Leadership"
  const withInMatch = cleanText.match(
    new RegExp(`${BSBA_PREFIX.source}in\\s+(.+?)${MAJOR_TERMINATOR}`, "i"),
  );
  if (withInMatch) return cleanExtractedMajor(withInMatch[1]);

  // Pattern 2: "B S Computer Science" or "B A Economics"
  const spacedMatch = cleanText.match(
    new RegExp(`${BSBA_PREFIX.source}(.+?)${MAJOR_TERMINATOR}`, "i"),
  );
  if (spacedMatch) return cleanExtractedMajor(spacedMatch[1]);

  // Pattern 3: other bachelor credentials, including compact or dotted forms.
  const degreeMatch = cleanText.match(
    new RegExp(
      String.raw`^(?:B[A-Za-z&]+|B(?:\.?\s*[A-Z&])+\.?|PharmD)(?:\s+|,\s*)(?:in\s+)?(.+?)${MAJOR_TERMINATOR}`,
      "i",
    ),
  );
  if (degreeMatch) return cleanExtractedMajor(degreeMatch[1]);

  // Pattern 4: "BSGS, Climate System Science"
  const codeFirstMatch = cleanText.match(
    new RegExp(String.raw`^[A-Z][A-Za-z&]+,\s*(.+?)${MAJOR_TERMINATOR}`),
  );
  if (codeFirstMatch) return cleanExtractedMajor(codeFirstMatch[1]);

  // Fallback: remove a leading degree prefix and keep the remaining phrase.
  const fallback = cleanExtractedMajor(
    stripDegreePrefix(cleanText).split(/\s+-\s+Credential:|,|\(/i)[0] ?? "",
  );

  return fallback || cleanText.split(/\s+-\s+Credential:|,|\(/i)[0].trim();
}
