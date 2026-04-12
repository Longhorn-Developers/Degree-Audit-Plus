export type ParseMajorFixtureCase = {
  input: string;
  expected: string;
  source: string;
};

export const utDirectDegreePlanCases: ParseMajorFixtureCase[] = [
  {
    input: "Bachelor of Social Work - Honors",
    expected: "Social Work",
    source: "UT Direct bachelor of social work honors plan",
  },
  {
    input: "Undergraduate - Undeclared",
    expected: "Undeclared",
    source: "UT Direct undeclared undergraduate plan",
  },
  { input: "PharmD", expected: "Pharmacy", source: "UT Direct PharmD plan" },
  {
    input: "PharmD, Research Honors in Pharmacy",
    expected: "Pharmacy",
    source: "UT Direct PharmD honors plan",
  },
  {
    input: "B A, Informatics",
    expected: "Informatics",
    source: "UT Direct BA informatics",
  },
  {
    input: "B A, major in Informatics; Cultural Heritage Informatics",
    expected: "Informatics",
    source: "UT Direct BA informatics track",
  },
  {
    input: "B A, major in Informatics; Cultural Heritage Informatics, Hn",
    expected: "Informatics",
    source: "UT Direct BA informatics honors track",
  },
  {
    input: "B A, major in Informatics; Human-Centered Data Science",
    expected: "Informatics",
    source: "UT Direct BA informatics track",
  },
  {
    input: "B A, major in Informatics; Human-Centered Data Science, Hnr",
    expected: "Informatics",
    source: "UT Direct BA informatics honors track",
  },
  {
    input: "B A, major in Informatics; Health Informatics",
    expected: "Informatics",
    source: "UT Direct BA informatics track",
  },
  {
    input: "B A, major in Informatics; Health Informatics, Hnr",
    expected: "Informatics",
    source: "UT Direct BA informatics honors track",
  },
  {
    input: "B A, major in Informatics; Social Informatics",
    expected: "Informatics",
    source: "UT Direct BA informatics track",
  },
  {
    input: "B A, major in Informatics; Social Informatics, Hnr",
    expected: "Informatics",
    source: "UT Direct BA informatics honors track",
  },
  {
    input: "B A, major in Informatics; Social Justice Informatics",
    expected: "Informatics",
    source: "UT Direct BA informatics track",
  },
  {
    input: "B A, major in Informatics; Social Justice Informatics, Hnr",
    expected: "Informatics",
    source: "UT Direct BA informatics honors track",
  },
  {
    input: "B A, major in Informatics; User Experience Design",
    expected: "Informatics",
    source: "UT Direct BA informatics track",
  },
  {
    input: "B A, major in Informatics; User Experience Design, Hnr",
    expected: "Informatics",
    source: "UT Direct BA informatics honors track",
  },
  {
    input: "B S in Informatics",
    expected: "Informatics",
    source: "UT Direct BS informatics",
  },
  {
    input: "B S in Informatics; Cultural Heritage Informatics",
    expected: "Informatics",
    source: "UT Direct BS informatics track",
  },
  {
    input: "B S in Informatics; Cultural Heritage Informatics, Hnr",
    expected: "Informatics",
    source: "UT Direct BS informatics honors track",
  },
  {
    input: "B S in Informatics; Human-Centered Data Science",
    expected: "Informatics",
    source: "UT Direct BS informatics track",
  },
  {
    input: "B S in Informatics; Human-Centered Data Science, Hnr",
    expected: "Informatics",
    source: "UT Direct BS informatics honors track",
  },
  {
    input: "B S in Informatics; Health Informatics",
    expected: "Informatics",
    source: "UT Direct BS informatics track",
  },
  {
    input: "B S in Informatics; Health Informatics, Hnr",
    expected: "Informatics",
    source: "UT Direct BS informatics honors track",
  },
  {
    input: "B S in Informatics; Social Informatics",
    expected: "Informatics",
    source: "UT Direct BS informatics track",
  },
  {
    input: "B S in Informatics; Social Informatics, Hnr",
    expected: "Informatics",
    source: "UT Direct BS informatics honors track",
  },
  {
    input: "B S in Informatics; Social Justice Informatics",
    expected: "Informatics",
    source: "UT Direct BS informatics track",
  },
  {
    input: "B S in Informatics; Social Justice Informatics, Hnr",
    expected: "Informatics",
    source: "UT Direct BS informatics honors track",
  },
  {
    input: "B S in Informatics; User Experience Design",
    expected: "Informatics",
    source: "UT Direct BS informatics track",
  },
  {
    input: "B S in Informatics; User Experience Design, Hnr",
    expected: "Informatics",
    source: "UT Direct BS informatics honors track",
  },
  {
    input: "BS ED, Generic All-Level Special Education",
    expected: "Education",
    source: "UT Direct education degree plan",
  },
  {
    input: "BS ED, EC-6 ESL Bilingual Generalist Certification",
    expected: "Education",
    source: "UT Direct education degree plan",
  },
  {
    input: "BS ED, EC-6 ESL Generalist Certification",
    expected: "Education",
    source: "UT Direct education degree plan",
  },
  {
    input: "BS ED, YCS w/ Yth/Soc Serv, Science track",
    expected: "Youth and community studies",
    source: "UT Direct youth and community studies plan",
  },
  {
    input: "BS ED, YCS w/ Coaching, MN/CT",
    expected: "Youth and community studies",
    source: "UT Direct youth and community studies plan",
  },
  {
    input: "BS ED, YCS w/ Coaching, Science track",
    expected: "Youth and community studies",
    source: "UT Direct youth and community studies plan",
  },
  {
    input: "BS ED, YCS w/ Coaching, Cultural Studies track",
    expected: "Youth and community studies",
    source: "UT Direct youth and community studies plan",
  },
  {
    input: "BS ED, YCS w/ Coaching, Education track",
    expected: "Youth and community studies",
    source: "UT Direct youth and community studies plan",
  },
  {
    input: "BS ED, YCS, Coaching, Comm Hlth/Well",
    expected: "Youth and community studies",
    source: "UT Direct youth and community studies plan",
  },
  {
    input: "BS ED, YCS, Coaching, Disability Stud",
    expected: "Youth and community studies",
    source: "UT Direct youth and community studies plan",
  },
  {
    input: "BS ED, YCS, Coaching, Health Fit Inst",
    expected: "Youth and community studies",
    source: "UT Direct youth and community studies plan",
  },
  {
    input: "BS ED, YCS, Coaching, Med Fit & Rehab",
    expected: "Youth and community studies",
    source: "UT Direct youth and community studies plan",
  },
  {
    input: "BS ED, YCS w/ Coaching, Social Studies track",
    expected: "Youth and community studies",
    source: "UT Direct youth and community studies plan",
  },
  {
    input: "BS ED, YCS w/ Coaching, E/LA track",
    expected: "Youth and community studies",
    source: "UT Direct youth and community studies plan",
  },
  {
    input: "BS ED, YCS w/ Coaching, SOC/S W track",
    expected: "Youth and community studies",
    source: "UT Direct youth and community studies plan",
  },
  {
    input: "BS ED, YCS w/ Early Child, MN/CT",
    expected: "Youth and community studies",
    source: "UT Direct youth and community studies plan",
  },
  {
    input: "BS ED, YCS w/ Early Child, Science track",
    expected: "Youth and community studies",
    source: "UT Direct youth and community studies plan",
  },
  {
    input: "BS ED, YCS w/ Early Child, Cultural Studies track",
    expected: "Youth and community studies",
    source: "UT Direct youth and community studies plan",
  },
  {
    input: "BS ED, YCS w/ Early Child, Education track",
    expected: "Youth and community studies",
    source: "UT Direct youth and community studies plan",
  },
  {
    input: "BS ED, YCS w/ Early Child, Coaching",
    expected: "Youth and community studies",
    source: "UT Direct youth and community studies plan",
  },
  {
    input: "BS ED, YCS w/ Early Child, Comm Hlth/Well",
    expected: "Youth and community studies",
    source: "UT Direct youth and community studies plan",
  },
  {
    input: "BS ED, YCS, w/ Early Child, Disability Stud",
    expected: "Youth and community studies",
    source: "UT Direct youth and community studies plan",
  },
  {
    input: "BS ED, YCS, Early Childhood, Health Fit Inst",
    expected: "Youth and community studies",
    source: "UT Direct youth and community studies plan",
  },
  {
    input: "BS ED, YCS w/ Early Child, Med Fit & Rehab",
    expected: "Youth and community studies",
    source: "UT Direct youth and community studies plan",
  },
  {
    input: "BS ED, YCS w/ Early Child, Strength/Cond Coach",
    expected: "Youth and community studies",
    source: "UT Direct youth and community studies plan",
  },
  {
    input: "BS ED, YCS w/ Early Child, Social Studies track",
    expected: "Youth and community studies",
    source: "UT Direct youth and community studies plan",
  },
  {
    input: "BS ED, YCS w/ Early Child, E/LA track",
    expected: "Youth and community studies",
    source: "UT Direct youth and community studies plan",
  },
  {
    input: "BS ED, YCS w/ Early Child, SOC/S W track",
    expected: "Youth and community studies",
    source: "UT Direct youth and community studies plan",
  },
  {
    input: "BS ED, YCS w/ ELP, MN/CT",
    expected: "Youth and community studies",
    source: "UT Direct youth and community studies plan",
  },
  {
    input: "BS ED, YCS w/ ELP, Science track",
    expected: "Youth and community studies",
    source: "UT Direct youth and community studies plan",
  },
  {
    input: "BS ED, YCS w/ ELP, Education track",
    expected: "Youth and community studies",
    source: "UT Direct youth and community studies plan",
  },
  {
    input: "BS ED, YCS w/ ELP, Coaching",
    expected: "Youth and community studies",
    source: "UT Direct youth and community studies plan",
  },
  {
    input: "BS ED, YCS w/ ELP, Comm Hlth/Well",
    expected: "Youth and community studies",
    source: "UT Direct youth and community studies plan",
  },
  {
    input: "BS ED, YCS w/ ELP, Health Fit Inst",
    expected: "Youth and community studies",
    source: "UT Direct youth and community studies plan",
  },
  {
    input: "BS ED, YCS w/ ELP, Med Fit & Rehab",
    expected: "Youth and community studies",
    source: "UT Direct youth and community studies plan",
  },
  {
    input: "BS ED, YCS w/ ELP, Strength/Cond Coach",
    expected: "Youth and community studies",
    source: "UT Direct youth and community studies plan",
  },
  {
    input: "BS ED, YCS w/ ELP, Social Studies track",
    expected: "Youth and community studies",
    source: "UT Direct youth and community studies plan",
  },
  {
    input: "BS ED, YCS w/ ELP, E/LA track",
    expected: "Youth and community studies",
    source: "UT Direct youth and community studies plan",
  },
  {
    input: "BS ED, YCS w/ ELP, SOC/S W track",
    expected: "Youth and community studies",
    source: "UT Direct youth and community studies plan",
  },
  {
    input: "BS ED, YCS w/ Phys Ed, MN/CT",
    expected: "Youth and community studies",
    source: "UT Direct youth and community studies plan",
  },
  {
    input: "BS ED, YCS w/ Phys Ed, Science track",
    expected: "Youth and community studies",
    source: "UT Direct youth and community studies plan",
  },
  {
    input: "BS ED, YCS w/ Phys Ed, Cultural Studies track",
    expected: "Youth and community studies",
    source: "UT Direct youth and community studies plan",
  },
  {
    input: "BS ED, YCS w/ Phys Ed, Education track",
    expected: "Youth and community studies",
    source: "UT Direct youth and community studies plan",
  },
  {
    input: "BS ED, YCS w/ Phys Ed, Coaching",
    expected: "Youth and community studies",
    source: "UT Direct youth and community studies plan",
  },
  {
    input: "BS ED, YCS w/ Phys Ed, Comm Hlth/Well",
    expected: "Youth and community studies",
    source: "UT Direct youth and community studies plan",
  },
  {
    input: "BS ED, YCS w/ Phys Ed, Disability Stud",
    expected: "Youth and community studies",
    source: "UT Direct youth and community studies plan",
  },
  {
    input: "BS ED, YCS w/ Phys Ed, Health Fit Inst",
    expected: "Youth and community studies",
    source: "UT Direct youth and community studies plan",
  },
  {
    input: "BS ED, YCS w/ Phys Ed, Med Fit & Rehab",
    expected: "Youth and community studies",
    source: "UT Direct youth and community studies plan",
  },
  {
    input: "BS ED, YCS w/ Phys Ed, Strength/Cond Coach",
    expected: "Youth and community studies",
    source: "UT Direct youth and community studies plan",
  },
  {
    input: "BS ED, YCS w/ Phys Ed, PAE track",
    expected: "Youth and community studies",
    source: "UT Direct youth and community studies plan",
  },
  {
    input: "BS ED, YCS w/ Phys Ed, Social Studies track",
    expected: "Youth and community studies",
    source: "UT Direct youth and community studies plan",
  },
  {
    input: "BS ED, YCS w/ Phys Ed, E/LA track",
    expected: "Youth and community studies",
    source: "UT Direct youth and community studies plan",
  },
  {
    input: "BS ED, YCS w/ Phys Ed, SOC/S W track",
    expected: "Youth and community studies",
    source: "UT Direct youth and community studies plan",
  },
  {
    input: "BS ED, YCS w/ Spec Pop, MN/CT",
    expected: "Youth and community studies",
    source: "UT Direct youth and community studies plan",
  },
  {
    input: "BS ED, YCS w/ Spec Pop, Science track",
    expected: "Youth and community studies",
    source: "UT Direct youth and community studies plan",
  },
  {
    input: "BS ED, YCS w/ Spec Pop, Cultural Studies track",
    expected: "Youth and community studies",
    source: "UT Direct youth and community studies plan",
  },
  {
    input: "BS ED, YCS w/ Spec Pop, Education track",
    expected: "Youth and community studies",
    source: "UT Direct youth and community studies plan",
  },
  {
    input: "BS ED, YCS w/ Spec Pop, Coaching",
    expected: "Youth and community studies",
    source: "UT Direct youth and community studies plan",
  },
  {
    input: "BS ED, YCS w/ Spec Pop, Comm Hlth/Well",
    expected: "Youth and community studies",
    source: "UT Direct youth and community studies plan",
  },
  {
    input: "BS ED, YCS w/ Spec Pop, Disability Stud",
    expected: "Youth and community studies",
    source: "UT Direct youth and community studies plan",
  },
  {
    input: "BS ED, YCS w/ Spec Pop, Health Fit Inst",
    expected: "Youth and community studies",
    source: "UT Direct youth and community studies plan",
  },
  {
    input: "BS ED, YCS w/ Spec Pop, Med Fit & Rehab",
    expected: "Youth and community studies",
    source: "UT Direct youth and community studies plan",
  },
  {
    input: "BS ED, YCS w/ Spec Pop, Strength/Cond Coach",
    expected: "Youth and community studies",
    source: "UT Direct youth and community studies plan",
  },
  {
    input: "BS ED, YCS w/ Spec Pop, Social Studies track",
    expected: "Youth and community studies",
    source: "UT Direct youth and community studies plan",
  },
  {
    input: "BS ED, YCS w/ Spec Pop, E/LA track",
    expected: "Youth and community studies",
    source: "UT Direct youth and community studies plan",
  },
  {
    input: "BS ED, YCS w/ Spec Pop, SOC/S W track",
    expected: "Youth and community studies",
    source: "UT Direct youth and community studies plan",
  },
  {
    input: "BS ED, YCS w/ Urban Teachers, MN/CT",
    expected: "Youth and community studies",
    source: "UT Direct youth and community studies plan",
  },
  {
    input: "BS ED, YCS w/ Urban Teachers, Social Studies track",
    expected: "Youth and community studies",
    source: "UT Direct youth and community studies plan",
  },
  {
    input: "BS ED, YCS w/ Urban Teachers, E/LA track",
    expected: "Youth and community studies",
    source: "UT Direct youth and community studies plan",
  },
  {
    input: "BS ED, YCS w/ Yth/Soc Serv, MN/CT",
    expected: "Youth and community studies",
    source: "UT Direct youth and community studies plan",
  },
  {
    input: "BS ED, YCS w/ Yth/Soc Serv, Science track",
    expected: "Youth and community studies",
    source: "UT Direct youth and community studies plan",
  },
  {
    input: "BS ED, YCS w/ Yth/Soc Serv, Cultural Studies track",
    expected: "Youth and community studies",
    source: "UT Direct youth and community studies plan",
  },
  {
    input: "BS ED, YCS w/ Yth/Soc Serv, Education track",
    expected: "Youth and community studies",
    source: "UT Direct youth and community studies plan",
  },
  {
    input: "BS ED, YCS w/ Yth/Soc Serv, Coaching",
    expected: "Youth and community studies",
    source: "UT Direct youth and community studies plan",
  },
  {
    input: "BS ED, YCS w/ Yth/Soc Serv, Comm Hlth/Well",
    expected: "Youth and community studies",
    source: "UT Direct youth and community studies plan",
  },
  {
    input: "BS ED, YCS w/ Yth/Soc Serv, Disability Stud",
    expected: "Youth and community studies",
    source: "UT Direct youth and community studies plan",
  },
  {
    input: "BS ED, YCS w/ Yth/Soc Serv, Health Fit Inst",
    expected: "Youth and community studies",
    source: "UT Direct youth and community studies plan",
  },
  {
    input: "BS ED, YCS w/ Yth/Soc Serv, Med Fit & Rehab",
    expected: "Youth and community studies",
    source: "UT Direct youth and community studies plan",
  },
  {
    input: "BS ED, YCS w/ Yth/Soc Serv, Strength/Cond Coach",
    expected: "Youth and community studies",
    source: "UT Direct youth and community studies plan",
  },
  {
    input: "BS ED, YCS w/ Yth/Soc Serv, Social Studies track",
    expected: "Youth and community studies",
    source: "UT Direct youth and community studies plan",
  },
  {
    input: "BS ED, YCS w/ Yth/Soc Serv, E/LA track",
    expected: "Youth and community studies",
    source: "UT Direct youth and community studies plan",
  },
  {
    input: "BS ED, YCS w/ Yth/Soc Serv, SOC/S W track",
    expected: "Youth and community studies",
    source: "UT Direct youth and community studies plan",
  },
  {
    input: "B S in Athletic Training",
    expected: "Athletic training",
    source: "UT Direct athletic training",
  },
  {
    input: "B S in Athletic Training with Coaching",
    expected: "Athletic training",
    source: "UT Direct athletic training specialization",
  },
  {
    input: "B S in Athletic Training with Comm Hlth/Well",
    expected: "Athletic training",
    source: "UT Direct athletic training specialization",
  },
  {
    input: "B S in Athletic Training with Health Fit Inst",
    expected: "Athletic training",
    source: "UT Direct athletic training specialization",
  },
  {
    input: "B S in Athletic Training with Med Fit & Rehab",
    expected: "Athletic training",
    source: "UT Direct athletic training specialization",
  },
  {
    input: "B S in Athletic Training with Strength/Cond Coach",
    expected: "Athletic training",
    source: "UT Direct athletic training specialization",
  },
  {
    input: "B S KHE, AMS w/ Science track",
    expected: "Applied movement science",
    source: "UT Direct KHE specialization",
  },
  {
    input: "B S KHE, AMS w/ Cultural Studies track",
    expected: "Applied movement science",
    source: "UT Direct KHE specialization",
  },
  {
    input: "B S KHE, AMS w/ Coaching",
    expected: "Applied movement science",
    source: "UT Direct KHE specialization",
  },
  {
    input: "B S KHE, AMS w/ Comm Hlth/Well",
    expected: "Applied movement science",
    source: "UT Direct KHE specialization",
  },
  {
    input: "B S KHE, AMS w/ Education track",
    expected: "Applied movement science",
    source: "UT Direct KHE specialization",
  },
  {
    input: "B S KHE, AMS w/ Health Fit Inst",
    expected: "Applied movement science",
    source: "UT Direct KHE specialization",
  },
  {
    input: "B S KHE, AMS w/ Med Fit & Rehab",
    expected: "Applied movement science",
    source: "UT Direct KHE specialization",
  },
  {
    input: "B S KHE, AMS w/ MN/CT",
    expected: "Applied movement science",
    source: "UT Direct KHE specialization",
  },
  {
    input: "B S KHE, AMS w/ Phys Ed track",
    expected: "Applied movement science",
    source: "UT Direct KHE specialization",
  },
  {
    input: "B S KHE, AMS w/ Social Studies track",
    expected: "Applied movement science",
    source: "UT Direct KHE specialization",
  },
  {
    input: "B S KHE, AMS w/ Strength/Cond Coach",
    expected: "Applied movement science",
    source: "UT Direct KHE specialization",
  },
  {
    input: "B S KHE, AMS w/ E/LA track",
    expected: "Applied movement science",
    source: "UT Direct KHE specialization",
  },
  {
    input: "B S KHE, AMS w/ SOC/S W track",
    expected: "Applied movement science",
    source: "UT Direct KHE specialization",
  },
  {
    input: "B S KHE, ES w/ Science track",
    expected: "Exercise science",
    source: "UT Direct KHE specialization",
  },
  {
    input: "B S KHE, ES w/ Cultural Studies track",
    expected: "Exercise science",
    source: "UT Direct KHE specialization",
  },
  {
    input: "B S KHE, ES w/ Coaching",
    expected: "Exercise science",
    source: "UT Direct KHE specialization",
  },
  {
    input: "B S KHE, ES w/ Comm Hlth/Well",
    expected: "Exercise science",
    source: "UT Direct KHE specialization",
  },
  {
    input: "B S KHE, ES w/ Education track",
    expected: "Exercise science",
    source: "UT Direct KHE specialization",
  },
  {
    input: "B S KHE, ES w/ Health Fit Inst",
    expected: "Exercise science",
    source: "UT Direct KHE specialization",
  },
  {
    input: "B S KHE, ES w/ Med Fit & Rehab",
    expected: "Exercise science",
    source: "UT Direct KHE specialization",
  },
  {
    input: "B S KHE, ES w/ MN/CT",
    expected: "Exercise science",
    source: "UT Direct KHE specialization",
  },
  {
    input: "B S KHE, ES w/ Phys Ed track",
    expected: "Exercise science",
    source: "UT Direct KHE specialization",
  },
  {
    input: "B S KHE, ES w/ Social Studies track",
    expected: "Exercise science",
    source: "UT Direct KHE specialization",
  },
  {
    input: "B S KHE, ES w/ Strength/Cond Coach",
    expected: "Exercise science",
    source: "UT Direct KHE specialization",
  },
  {
    input: "B S KHE, ES w/ E/LA track",
    expected: "Exercise science",
    source: "UT Direct KHE specialization",
  },
  {
    input: "B S KHE, ES w/ SOC/S W track",
    expected: "Exercise science",
    source: "UT Direct KHE specialization",
  },
  {
    input: "B S KHE, HPBS w/ Science track",
    expected: "Health promotion and behavioral science",
    source: "UT Direct KHE specialization",
  },
  {
    input: "B S KHE, HPBS w/ Cultural Studies track",
    expected: "Health promotion and behavioral science",
    source: "UT Direct KHE specialization",
  },
  {
    input: "B S KHE, HPBS w/ Coaching",
    expected: "Health promotion and behavioral science",
    source: "UT Direct KHE specialization",
  },
  {
    input: "B S KHE, HPBS w/ Comm Hlth/Well",
    expected: "Health promotion and behavioral science",
    source: "UT Direct KHE specialization",
  },
  {
    input: "B S KHE, HPBS w/ Education track",
    expected: "Health promotion and behavioral science",
    source: "UT Direct KHE specialization",
  },
  {
    input: "B S KHE, HPBS w/ Health Fit Inst",
    expected: "Health promotion and behavioral science",
    source: "UT Direct KHE specialization",
  },
  {
    input: "B S KHE, HPBS w/ Med Fit & Rehab",
    expected: "Health promotion and behavioral science",
    source: "UT Direct KHE specialization",
  },
  {
    input: "B S KHE, HPBS w/ MN/CT",
    expected: "Health promotion and behavioral science",
    source: "UT Direct KHE specialization",
  },
  {
    input: "B S KHE, HPBS w/ Phys Ed track",
    expected: "Health promotion and behavioral science",
    source: "UT Direct KHE specialization",
  },
  {
    input: "B S KHE, HPBS w/ Social Studies track",
    expected: "Health promotion and behavioral science",
    source: "UT Direct KHE specialization",
  },
  {
    input: "B S KHE, HPBS w/ Strength/Cond Coach",
    expected: "Health promotion and behavioral science",
    source: "UT Direct KHE specialization",
  },
  {
    input: "B S KHE, HPBS w/ E/LA track",
    expected: "Health promotion and behavioral science",
    source: "UT Direct KHE specialization",
  },
  {
    input: "B S KHE, HPBS w/ SOC/S W track",
    expected: "Health promotion and behavioral science",
    source: "UT Direct KHE specialization",
  },
  {
    input: "B S KHE, PCSS w/ Science track",
    expected: "Physical culture and sports studies",
    source: "UT Direct KHE specialization",
  },
  {
    input: "B S KHE, PCSS w/ Cultural Studies track",
    expected: "Physical culture and sports studies",
    source: "UT Direct KHE specialization",
  },
  {
    input: "B S KHE, PCSS w/ Coaching",
    expected: "Physical culture and sports studies",
    source: "UT Direct KHE specialization",
  },
  {
    input: "B S KHE, PCSS w/ Comm Hlth/Well",
    expected: "Physical culture and sports studies",
    source: "UT Direct KHE specialization",
  },
  {
    input: "B S KHE, PCSS w/ Education track",
    expected: "Physical culture and sports studies",
    source: "UT Direct KHE specialization",
  },
  {
    input: "B S KHE, PCSS w/ Health Fit Inst",
    expected: "Physical culture and sports studies",
    source: "UT Direct KHE specialization",
  },
  {
    input: "B S KHE, PCSS w/ Med Fit & Rehab",
    expected: "Physical culture and sports studies",
    source: "UT Direct KHE specialization",
  },
  {
    input: "B S KHE, PCSS w/ MN/CT",
    expected: "Physical culture and sports studies",
    source: "UT Direct KHE specialization",
  },
  {
    input: "B S KHE, PCSS w/ Phys Ed track",
    expected: "Physical culture and sports studies",
    source: "UT Direct KHE specialization",
  },
  {
    input: "B S KHE, PCSS w/ Social Studies track",
    expected: "Physical culture and sports studies",
    source: "UT Direct KHE specialization",
  },
  {
    input: "B S KHE, PCSS w/ Strength/Cond Coach",
    expected: "Physical culture and sports studies",
    source: "UT Direct KHE specialization",
  },
  {
    input: "B S KHE, PCSS w/ E/LA track",
    expected: "Physical culture and sports studies",
    source: "UT Direct KHE specialization",
  },
  {
    input: "B S KHE, PCSS w/ SOC/S W track",
    expected: "Physical culture and sports studies",
    source: "UT Direct KHE specialization",
  },
  {
    input: "B S KHE, SM w/ Science track",
    expected: "Sport management",
    source: "UT Direct KHE specialization",
  },
  {
    input: "B S KHE, SM w/ Cultural Studies track",
    expected: "Sport management",
    source: "UT Direct KHE specialization",
  },
  {
    input: "B S KHE, SM w/ Coaching",
    expected: "Sport management",
    source: "UT Direct KHE specialization",
  },
  {
    input: "B S KHE, SM w/ Comm Hlth/Well",
    expected: "Sport management",
    source: "UT Direct KHE specialization",
  },
  {
    input: "B S KHE, SM w/ Education track",
    expected: "Sport management",
    source: "UT Direct KHE specialization",
  },
  {
    input: "B S KHE, SM w/ Health Fit Inst",
    expected: "Sport management",
    source: "UT Direct KHE specialization",
  },
  {
    input: "B S KHE, SM w/ Med Fit & Rehab",
    expected: "Sport management",
    source: "UT Direct KHE specialization",
  },
  {
    input: "B S KHE, SM w/ MN/CT",
    expected: "Sport management",
    source: "UT Direct KHE specialization",
  },
  {
    input: "B S KHE, SM w/ Phys Ed track",
    expected: "Sport management",
    source: "UT Direct KHE specialization",
  },
  {
    input: "B S KHE, SM w/ Social Studies track",
    expected: "Sport management",
    source: "UT Direct KHE specialization",
  },
  {
    input: "B S KHE, SM w/ Strength/Cond Coach",
    expected: "Sport management",
    source: "UT Direct KHE specialization",
  },
  {
    input: "B S KHE, SM w/ E/LA track",
    expected: "Sport management",
    source: "UT Direct KHE specialization",
  },
  {
    input: "B S KHE, SM w/ SOC/S W track",
    expected: "Sport management",
    source: "UT Direct KHE specialization",
  },
  {
    input: "B A, major Asian Cultrs & Langs, Malayalam-Dept Hnrs",
    expected: "Asian cultures and languages",
    source: "UT Direct abbreviated Asian cultures and languages honors plan",
  },
  {
    input: "B A, major Astronomy",
    expected: "Astronomy",
    source: "UT Direct BA major label",
  },
  {
    input: "B A, major Mathematics, Teaching Option, Midl Grde",
    expected: "Mathematics",
    source: "UT Direct BA teaching option",
  },
  {
    input: "Natural Sciences B A * Undeclared * Incomplete *",
    expected: "Undeclared",
    source: "UT Direct incomplete undeclared BA",
  },
  {
    input: "BSA Biology* INCOMPLETE",
    expected: "Biology",
    source: "UT Direct incomplete BSA",
  },
  {
    input: "BSA Biology, Option: Biochemistry Concentration",
    expected: "Biology",
    source: "UT Direct BSA option label",
  },
  {
    input: "BSA Biology, Ecol, Evol, and Biodiversity Concentration",
    expected: "Biology",
    source: "UT Direct biology concentration label",
  },
  {
    input: "BSA Biology, Organismal Biology and Physiology Honors",
    expected: "Biology",
    source: "UT Direct biology honors label",
  },
  {
    input: "BSA Computer Science, Honors",
    expected: "Computer Science",
    source: "UT Direct BSA honors label",
  },
  {
    input: "ENTRY-LEVEL requirements, Environmental Science",
    expected: "Environmental Science",
    source: "UT Direct entry-level requirements",
  },
  {
    input: "BS in Statistics and Data Sciences, Entry-Level",
    expected: "Statistics and Data Sciences",
    source: "UT Direct entry-level suffix",
  },
  {
    input: "B S Biology, Cell and Molecular Biology",
    expected: "Biology",
    source: "UT Direct BS biology track",
  },
  {
    input: "B S Environmental Science, Biological Sciences",
    expected: "Environmental Science",
    source: "UT Direct BS environmental science track",
  },
  {
    input: "BS Chemistry, Focus Area III: Materials Chemistry",
    expected: "Chemistry",
    source: "UT Direct chemistry focus area",
  },
  {
    input: "B S HDFS, Honors in Advanced HDFS",
    expected: "Human Development and Family Sciences",
    source: "UT Direct HDFS honors shorthand",
  },
  {
    input: "B S Mathematics, Actuarial Science option",
    expected: "Mathematics",
    source: "UT Direct mathematics option",
  },
  {
    input: "B S in Neuroscience, Neuroscience Scholars",
    expected: "Neuroscience",
    source: "UT Direct neuroscience scholars option",
  },
  {
    input: "B S Nutrition, Dietetics, Didactic Program",
    expected: "Nutrition",
    source: "UT Direct nutrition track",
  },
  {
    input: "BS Public Health, Advanced Program",
    expected: "Public Health",
    source: "UT Direct public health advanced program",
  },
  {
    input: "B S Public Health; Public Health Honors",
    expected: "Public Health",
    source: "UT Direct public health semicolon honors",
  },
  {
    input: "B S Physics, Option VII: Biophysics",
    expected: "Physics",
    source: "UT Direct physics option",
  },
  {
    input: "B S Textiles & Apparel",
    expected: "Textiles & Apparel",
    source: "UT Direct ampersand major",
  },
];

export const engineeringDegreePlanCases: ParseMajorFixtureCase[] = [
  {
    input: "B S Aerospace Engineering, Atmospheric Flight",
    expected: "Aerospace Engineering",
    source: "UT Direct aerospace track",
  },
  {
    input: "B S Aerospace Engineering, Space Flight",
    expected: "Aerospace Engineering",
    source: "UT Direct aerospace track",
  },
  {
    input: "B S Biomedical Engineering, IV: Biomechanics",
    expected: "Biomedical Engineering",
    source: "UT Direct biomedical engineering track",
  },
  {
    input: "B S Biomedical Engineering, I: Imaging/Instrument",
    expected: "Biomedical Engineering",
    source: "UT Direct biomedical engineering track",
  },
  {
    input: "B S Chemical Engr, Process Systems & Product Engr",
    expected: "Chemical Engr",
    source: "UT Direct chemical engineering track",
  },
  {
    input: "B S Chemical Engr, Energy Technologies",
    expected: "Chemical Engr",
    source: "UT Direct chemical engineering track",
  },
  {
    input: "B S Chem Engr I: Mtrls Engr II: EnergyTec",
    expected: "Chem Engr",
    source: "UT Direct chemical engineering multi-track",
  },
  {
    input: "B S Chem Engr I: Env Engr II: Engr Econ",
    expected: "Chem Engr",
    source: "UT Direct chemical engineering multi-track",
  },
  {
    input: "BSECE(incomplete)*",
    expected: "Electrical and Computer Engr",
    source: "UT Direct BSECE incomplete shorthand",
  },
  {
    input: "BSECE, Data Science & Info Processing",
    expected: "Electrical and Computer Engr",
    source: "UT Direct BSECE specialization",
  },
  {
    input: "BSECE, Bus & ECE Hon, Software Engineering and Design",
    expected: "Electrical and Computer Engr",
    source: "UT Direct BSECE honors specialization",
  },
  {
    input: "BSECE, Honors, Energy Systems & Renewable Energy",
    expected: "Electrical and Computer Engr",
    source: "UT Direct BSECE honors track",
  },
  {
    input: "B S Mech Engr, Career Gateway Elective",
    expected: "Mech Engr",
    source: "UT Direct mechanical engineering elective label",
  },
  {
    input: "B S Petroleum Engineering *",
    expected: "Petroleum Engineering",
    source: "UT Direct petroleum engineering asterisk suffix",
  },
  {
    input: "B S Geosystems Engineering",
    expected: "Geosystems Engineering",
    source: "UT Direct geosystems engineering",
  },
];

export const fineArtsDegreePlanCases: ParseMajorFixtureCase[] = [
  {
    input: "B A, Art History",
    expected: "Art History",
    source: "UT Direct fine arts BA",
  },
  {
    input: "B A, Studio Art",
    expected: "Studio Art",
    source: "UT Direct fine arts BA",
  },
  {
    input: "B A, Design",
    expected: "Design",
    source: "UT Direct fine arts BA",
  },
  {
    input: "B A in Music; Emphasis in Composition, Bassoon",
    expected: "Music",
    source: "UT Direct BA music emphasis",
  },
  {
    input: "B A in Music; Emphasis in Composition, Clarinet",
    expected: "Music",
    source: "UT Direct BA music emphasis",
  },
  {
    input: "B A in Music; Emphasis in Composition, Double Bass",
    expected: "Music",
    source: "UT Direct BA music emphasis",
  },
  {
    input: "B A in Music; Emphasis in Composition, Euphonium",
    expected: "Music",
    source: "UT Direct BA music emphasis",
  },
  {
    input: "B A in Music; Emphasis in Composition, French Horn",
    expected: "Music",
    source: "UT Direct BA music emphasis",
  },
  {
    input: "B A in Music; Emphasis in Composition, Flute",
    expected: "Music",
    source: "UT Direct BA music emphasis",
  },
  {
    input: "B A in Music; Emphasis in Composition, Guitar",
    expected: "Music",
    source: "UT Direct BA music emphasis",
  },
  {
    input: "B A in Music; Emphasis in Composition, Harp",
    expected: "Music",
    source: "UT Direct BA music emphasis",
  },
  {
    input: "B A in Music; Emphasis in Composition, Harpsichord",
    expected: "Music",
    source: "UT Direct BA music emphasis",
  },
  {
    input: "B A in Music; Emphasis in Composition, Oboe",
    expected: "Music",
    source: "UT Direct BA music emphasis",
  },
  {
    input: "B A in Music; Emphasis in Composition, Organ",
    expected: "Music",
    source: "UT Direct BA music emphasis",
  },
  {
    input: "B A in Music; Emphasis in Composition, Piano",
    expected: "Music",
    source: "UT Direct BA music emphasis",
  },
  {
    input: "B A in Music; Emphasis in Composition, Percussion",
    expected: "Music",
    source: "UT Direct BA music emphasis",
  },
  {
    input: "B A in Music; Emphasis in Composition, Saxophone",
    expected: "Music",
    source: "UT Direct BA music emphasis",
  },
  {
    input: "B A in Music; Emphasis in Composition, Trombone",
    expected: "Music",
    source: "UT Direct BA music emphasis",
  },
  {
    input: "B A in Music; Emphasis in Composition, Trumpet",
    expected: "Music",
    source: "UT Direct BA music emphasis",
  },
  {
    input: "B A in Music; Emphasis in Composition, Tuba",
    expected: "Music",
    source: "UT Direct BA music emphasis",
  },
  {
    input: "B A in Music; Emphasis in Composition, Viola",
    expected: "Music",
    source: "UT Direct BA music emphasis",
  },
  {
    input: "B A in Music; Emphasis in Composition, Violoncello",
    expected: "Music",
    source: "UT Direct BA music emphasis",
  },
  {
    input: "B A in Music; Emphasis in Composition, Violin",
    expected: "Music",
    source: "UT Direct BA music emphasis",
  },
  {
    input: "B A in Music; Emphasis in Composition, Voice",
    expected: "Music",
    source: "UT Direct BA music emphasis",
  },
  {
    input: "B A in Music; Emphasis in Music, Bassoon",
    expected: "Music",
    source: "UT Direct BA music emphasis",
  },
  {
    input: "B A in Music; Emphasis in Music, Clarinet",
    expected: "Music",
    source: "UT Direct BA music emphasis",
  },
  {
    input: "B A in Music; Emphasis in Music, Double Bass",
    expected: "Music",
    source: "UT Direct BA music emphasis",
  },
  {
    input: "B A in Music; Emphasis in Music, Euphonium",
    expected: "Music",
    source: "UT Direct BA music emphasis",
  },
  {
    input: "B A in Music; Emphasis in Music, French Horn",
    expected: "Music",
    source: "UT Direct BA music emphasis",
  },
  {
    input: "B A in Music; Emphasis in Music, Flute",
    expected: "Music",
    source: "UT Direct BA music emphasis",
  },
  {
    input: "B A in Music; Emphasis in Music, Guitar",
    expected: "Music",
    source: "UT Direct BA music emphasis",
  },
  {
    input: "B A in Music; Emphasis in Music, Harp",
    expected: "Music",
    source: "UT Direct BA music emphasis",
  },
  {
    input: "B A in Music; Emphasis in Music, Harpsichord",
    expected: "Music",
    source: "UT Direct BA music emphasis",
  },
  {
    input: "B A in Music; Emphasis in Music, Oboe",
    expected: "Music",
    source: "UT Direct BA music emphasis",
  },
  {
    input: "B A in Music; Emphasis in Music, Organ",
    expected: "Music",
    source: "UT Direct BA music emphasis",
  },
  {
    input: "B A in Music; Emphasis in Music, Piano",
    expected: "Music",
    source: "UT Direct BA music emphasis",
  },
  {
    input: "B A in Music; Emphasis in Music, Percussion",
    expected: "Music",
    source: "UT Direct BA music emphasis",
  },
  {
    input: "B A in Music; Emphasis in Music, Saxophone",
    expected: "Music",
    source: "UT Direct BA music emphasis",
  },
  {
    input: "B A in Music; Emphasis in Music, Trombone",
    expected: "Music",
    source: "UT Direct BA music emphasis",
  },
  {
    input: "B A in Music; Emphasis in Music, Trumpet",
    expected: "Music",
    source: "UT Direct BA music emphasis",
  },
  {
    input: "B A in Music; Emphasis in Music, Tuba",
    expected: "Music",
    source: "UT Direct BA music emphasis",
  },
  {
    input: "B A in Music; Emphasis in Music, Viola",
    expected: "Music",
    source: "UT Direct BA music emphasis",
  },
  {
    input: "B A in Music; Emphasis in Music, Violoncello",
    expected: "Music",
    source: "UT Direct BA music emphasis",
  },
  {
    input: "B A in Music; Emphasis in Music, Violin",
    expected: "Music",
    source: "UT Direct BA music emphasis",
  },
  {
    input: "B A in Music; Emphasis in Music, Voice",
    expected: "Music",
    source: "UT Direct BA music emphasis",
  },
  {
    input: "B A in Theatre and Dance",
    expected: "Theatre and Dance",
    source: "UT Direct theatre and dance BA",
  },
  {
    input: "BA in Theatre and Dance, Dance",
    expected: "Theatre and Dance",
    source: "UT Direct theatre and dance BA track",
  },
  {
    input: "BA in Theatre and Dance, Design and Tech",
    expected: "Theatre and Dance",
    source: "UT Direct theatre and dance BA track",
  },
  {
    input: "BA in Theatre and Dance, His, Lit, and Drama",
    expected: "Theatre and Dance",
    source: "UT Direct theatre and dance BA track",
  },
  {
    input: "BA in Theatre and Dance, Playwriting and Directing",
    expected: "Theatre and Dance",
    source: "UT Direct theatre and dance BA track",
  },
  {
    input: "BA in Theatre and Dance, Performer's Process",
    expected: "Theatre and Dance",
    source: "UT Direct theatre and dance BA track",
  },
  {
    input: "BA in Theatre and Dance, Theatre for Youth and Communities",
    expected: "Theatre and Dance",
    source: "UT Direct theatre and dance BA track",
  },
  {
    input: "B F A, Art Education",
    expected: "Art Education",
    source: "UT Direct fine arts BFA",
  },
  {
    input: "B F A, Studio Art",
    expected: "Studio Art",
    source: "UT Direct fine arts BFA",
  },
  {
    input: "B F A, Design",
    expected: "Design",
    source: "UT Direct fine arts BFA",
  },
  {
    input: "B F A, Acting",
    expected: "Acting",
    source: "UT Direct fine arts BFA",
  },
  {
    input: "B F A, Dance, Dance Option",
    expected: "Dance",
    source: "UT Direct dance BFA option",
  },
  {
    input: "B F A, Dance, Dance Education Option",
    expected: "Dance",
    source: "UT Direct dance BFA option",
  },
  {
    input: "B F A, Theatre Education",
    expected: "Theatre Education",
    source: "UT Direct fine arts BFA",
  },
  {
    input: "B M, Composition, Traditional, Bassoon",
    expected: "Composition",
    source: "UT Direct bachelor of music track",
  },
  {
    input: "B M, Composition, Traditional, Clarinet",
    expected: "Composition",
    source: "UT Direct bachelor of music track",
  },
  {
    input: "B M, Composition, Traditional, Double Bass",
    expected: "Composition",
    source: "UT Direct bachelor of music track",
  },
  {
    input: "B M, Composition, Traditional, Euphonium",
    expected: "Composition",
    source: "UT Direct bachelor of music track",
  },
  {
    input: "B M, Composition, Traditional, French Horn",
    expected: "Composition",
    source: "UT Direct bachelor of music track",
  },
  {
    input: "B M, Composition, Traditional, Flute",
    expected: "Composition",
    source: "UT Direct bachelor of music track",
  },
  {
    input: "B M, Composition, Traditional, Guitar",
    expected: "Composition",
    source: "UT Direct bachelor of music track",
  },
  {
    input: "B M, Composition, Traditional, Harp",
    expected: "Composition",
    source: "UT Direct bachelor of music track",
  },
  {
    input: "B M, Composition, Traditional, Harpsichord",
    expected: "Composition",
    source: "UT Direct bachelor of music track",
  },
  {
    input: "B M, Composition, Traditional, Oboe",
    expected: "Composition",
    source: "UT Direct bachelor of music track",
  },
  {
    input: "B M, Composition, Traditional, Organ",
    expected: "Composition",
    source: "UT Direct bachelor of music track",
  },
  {
    input: "B M, Composition, Traditional, Piano",
    expected: "Composition",
    source: "UT Direct bachelor of music track",
  },
  {
    input: "B M, Composition, Traditional, Percussion",
    expected: "Composition",
    source: "UT Direct bachelor of music track",
  },
  {
    input: "B M, Composition, Traditional, Saxophone",
    expected: "Composition",
    source: "UT Direct bachelor of music track",
  },
  {
    input: "B M, Composition, Traditional, Trombone",
    expected: "Composition",
    source: "UT Direct bachelor of music track",
  },
  {
    input: "B M, Composition, Traditional, Trumpet",
    expected: "Composition",
    source: "UT Direct bachelor of music track",
  },
  {
    input: "B M, Composition, Traditional, Tuba",
    expected: "Composition",
    source: "UT Direct bachelor of music track",
  },
  {
    input: "B M, Composition, Traditional, Viola",
    expected: "Composition",
    source: "UT Direct bachelor of music track",
  },
  {
    input: "B M, Composition, Traditional, Violoncello",
    expected: "Composition",
    source: "UT Direct bachelor of music track",
  },
  {
    input: "B M, Composition, Traditional, Violin",
    expected: "Composition",
    source: "UT Direct bachelor of music track",
  },
  {
    input: "B M, Composition, Traditional, Voice",
    expected: "Composition",
    source: "UT Direct bachelor of music track",
  },
  {
    input: "B M, Harp Performance",
    expected: "Harp Performance",
    source: "UT Direct bachelor of music performance",
  },
  {
    input: "B M, Jazz, Double Bass",
    expected: "Jazz",
    source: "UT Direct bachelor of music jazz",
  },
  {
    input: "B M, Jazz, Drum Set",
    expected: "Jazz",
    source: "UT Direct bachelor of music jazz",
  },
  {
    input: "B M, Jazz, Guitar",
    expected: "Jazz",
    source: "UT Direct bachelor of music jazz",
  },
  {
    input: "B M, Jazz, Piano",
    expected: "Jazz",
    source: "UT Direct bachelor of music jazz",
  },
  {
    input: "B M, Jazz, Saxophone",
    expected: "Jazz",
    source: "UT Direct bachelor of music jazz",
  },
  {
    input: "B M, Jazz, Trombone",
    expected: "Jazz",
    source: "UT Direct bachelor of music jazz",
  },
  {
    input: "B M, Jazz, Trumpet",
    expected: "Jazz",
    source: "UT Direct bachelor of music jazz",
  },
  {
    input: "B M, Music Studies, Choral, Piano",
    expected: "Music Studies",
    source: "UT Direct bachelor of music studies",
  },
  {
    input: "B M, Music Studies, Choral, Voice",
    expected: "Music Studies",
    source: "UT Direct bachelor of music studies",
  },
  {
    input: "B M, Music Studies, Instrumental, Bassoon",
    expected: "Music Studies",
    source: "UT Direct bachelor of music studies",
  },
  {
    input: "B M, Music Studies, Instrumental, Clarinet",
    expected: "Music Studies",
    source: "UT Direct bachelor of music studies",
  },
  {
    input: "B M, Music Studies, Instrumental, Double Bass",
    expected: "Music Studies",
    source: "UT Direct bachelor of music studies",
  },
  {
    input: "B M, Music Studies, Instrumental, Euphonium",
    expected: "Music Studies",
    source: "UT Direct bachelor of music studies",
  },
  {
    input: "B M, Music Studies, Instrumental, French Horn",
    expected: "Music Studies",
    source: "UT Direct bachelor of music studies",
  },
  {
    input: "B M, Music Studies, Instrumental, Flute",
    expected: "Music Studies",
    source: "UT Direct bachelor of music studies",
  },
  {
    input: "B M, Music Studies, Instrumental, Guitar",
    expected: "Music Studies",
    source: "UT Direct bachelor of music studies",
  },
  {
    input: "B M, Music Studies, Instrumental, Harp",
    expected: "Music Studies",
    source: "UT Direct bachelor of music studies",
  },
  {
    input: "B M, Music Studies, Instrumental, Harpsichord",
    expected: "Music Studies",
    source: "UT Direct bachelor of music studies",
  },
  {
    input: "B M, Music Studies, Instrumental, Oboe",
    expected: "Music Studies",
    source: "UT Direct bachelor of music studies",
  },
  {
    input: "B M, Music Studies, Instrumental, Organ",
    expected: "Music Studies",
    source: "UT Direct bachelor of music studies",
  },
  {
    input: "B M, Music Studies, Instrumental, Piano",
    expected: "Music Studies",
    source: "UT Direct bachelor of music studies",
  },
  {
    input: "B M, Music Studies, Instrumental, Percussion",
    expected: "Music Studies",
    source: "UT Direct bachelor of music studies",
  },
  {
    input: "B M, Music Studies, Instrumental, Saxophone",
    expected: "Music Studies",
    source: "UT Direct bachelor of music studies",
  },
  {
    input: "B M, Music Studies, Instrumental, Trombone",
    expected: "Music Studies",
    source: "UT Direct bachelor of music studies",
  },
  {
    input: "B M, Music Studies, Instrumental, Trumpet",
    expected: "Music Studies",
    source: "UT Direct bachelor of music studies",
  },
  {
    input: "B M, Music Studies, Instrumental, Tuba",
    expected: "Music Studies",
    source: "UT Direct bachelor of music studies",
  },
  {
    input: "B M, Music Studies, Instrumental, Viola",
    expected: "Music Studies",
    source: "UT Direct bachelor of music studies",
  },
  {
    input: "B M, Music Studies, Instrumental, Violoncello",
    expected: "Music Studies",
    source: "UT Direct bachelor of music studies",
  },
  {
    input: "B M, Music Studies, Instrumental, Violin",
    expected: "Music Studies",
    source: "UT Direct bachelor of music studies",
  },
  {
    input: "B M, Organ or Harpsichord Performance",
    expected: "Organ or Harpsichord Performance",
    source: "UT Direct bachelor of music performance",
  },
  {
    input: "B M, Orch. Instrument, Traditional, Bassoon",
    expected: "Orch. Instrument",
    source: "UT Direct bachelor of music orchestral instrument",
  },
  {
    input: "B M, Orch. Instrument, Traditional, Clarinet",
    expected: "Orch. Instrument",
    source: "UT Direct bachelor of music orchestral instrument",
  },
  {
    input: "B M, Orch. Instrument, Traditional, Double Bass",
    expected: "Orch. Instrument",
    source: "UT Direct bachelor of music orchestral instrument",
  },
  {
    input: "B M, Orch. Instrument, Traditional, Euphonium",
    expected: "Orch. Instrument",
    source: "UT Direct bachelor of music orchestral instrument",
  },
  {
    input: "B M, Orch. Instrument, Traditional, French Horn",
    expected: "Orch. Instrument",
    source: "UT Direct bachelor of music orchestral instrument",
  },
  {
    input: "B M, Orch. Instrument, Traditional, Flute",
    expected: "Orch. Instrument",
    source: "UT Direct bachelor of music orchestral instrument",
  },
  {
    input: "B M, Orch. Instrument, Traditional, Guitar",
    expected: "Orch. Instrument",
    source: "UT Direct bachelor of music orchestral instrument",
  },
  {
    input: "B M, Orch. Instrument, Traditional, Oboe",
    expected: "Orch. Instrument",
    source: "UT Direct bachelor of music orchestral instrument",
  },
  {
    input: "B M, Orch. Instrument, Traditional, Percussion",
    expected: "Orch. Instrument",
    source: "UT Direct bachelor of music orchestral instrument",
  },
  {
    input: "B M, Orch. Instrument, Traditional, Saxophone",
    expected: "Orch. Instrument",
    source: "UT Direct bachelor of music orchestral instrument",
  },
  {
    input: "B M, Orch. Instrument, Traditional, Trombone",
    expected: "Orch. Instrument",
    source: "UT Direct bachelor of music orchestral instrument",
  },
  {
    input: "B M, Orch. Instrument, Traditional, Trumpet",
    expected: "Orch. Instrument",
    source: "UT Direct bachelor of music orchestral instrument",
  },
  {
    input: "B M, Orch. Instrument, Traditional, Tuba",
    expected: "Orch. Instrument",
    source: "UT Direct bachelor of music orchestral instrument",
  },
  {
    input: "B M, Orch. Instrument, Traditional, Viola",
    expected: "Orch. Instrument",
    source: "UT Direct bachelor of music orchestral instrument",
  },
  {
    input: "B M, Orch. Instrument, Traditional, Violoncello",
    expected: "Orch. Instrument",
    source: "UT Direct bachelor of music orchestral instrument",
  },
  {
    input: "B M, Orch. Instrument, Traditional, Violin",
    expected: "Orch. Instrument",
    source: "UT Direct bachelor of music orchestral instrument",
  },
  {
    input: "B M, Piano Performance",
    expected: "Piano Performance",
    source: "UT Direct bachelor of music performance",
  },
  {
    input: "B M, Voice Performance",
    expected: "Voice Performance",
    source: "UT Direct bachelor of music performance",
  },
  {
    input: "B S in Arts and Entertainment Tech",
    expected: "Arts and Entertainment Tech",
    source: "UT Direct arts and entertainment tech",
  },
];
