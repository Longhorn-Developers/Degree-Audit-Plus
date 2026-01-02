import React from "react";
import { AuditData, CourseRowData, CourseStatus } from "./general-types";
const AuditScraper = () => {};

export const courseScraper = async () => {
  const AUDIT_RESULTS_URL =
    "https://utdirect.utexas.edu/apps/degree/audits/results/100017390968/";

  console.log("Fetching audit results...");
  const response = await fetch(AUDIT_RESULTS_URL, {
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const html = await response.text();
  // Parse HTML using DOMParser
  console.log(html);
  const doc = new DOMParser().parseFromString(html, "text/html");

  const competedCourses: CourseRowData[] = [];
  const plannedCourses: CourseRowData[] = [];
  const inProgressCourses: CourseRowData[] = [];
  const table = doc.querySelector("#coursework table.results");
  console.log(table);
  if (!table) {
    throw new Error("Audit results table not found");
  }
};

export default AuditScraper;
