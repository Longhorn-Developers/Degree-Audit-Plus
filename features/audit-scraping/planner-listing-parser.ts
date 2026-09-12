import { PlannerError, type PlannerAddLink } from "@/domain/planner";
import type { CourseCode } from "@/domain/course";
import { assertPlannerPage, collapseWhitespace } from "./planner-page-parser";

// every page=4 link on a page=3 listing, hrefs are relative so they get
// resolved against the listing url and kept verbatim otherwise
export function parsePlannerListing(
  document: Document,
  listingUrl: string,
): PlannerAddLink[] {
  assertPlannerPage(document);

  const links: PlannerAddLink[] = [];
  for (const anchor of document.querySelectorAll('a[href*="page=4"]')) {
    const url = new URL(anchor.getAttribute("href") ?? "", listingUrl);
    const department = url.searchParams.get("dpt");
    const number = url.searchParams.get("course_num");
    const ccyys = url.searchParams.get("course_ccyys");
    if (!department || !number || !ccyys) {
      throw new PlannerError("PLANNER_PAGE_CHANGED");
    }

    // the first cell has the code as ut prints it, fall back to building it
    let code = `${department} ${number}` as CourseCode;
    const firstCell = anchor.closest("tr")?.querySelector("td");
    if (firstCell) {
      code = collapseWhitespace(firstCell.textContent) as CourseCode;
    }

    links.push({
      href: url.toString(),
      department,
      number,
      ccyys,
      topicId: url.searchParams.get("course_topic_id") || null,
      code,
      title: collapseWhitespace(anchor.textContent),
    });
  }
  return links;
}

// ut shows 40 courses per listing page and links the rest as "Next courses"
export function parseNextListingUrl(
  document: Document,
  listingUrl: string,
): string | null {
  for (const anchor of document.querySelectorAll('a[href*="page=3"]')) {
    if (collapseWhitespace(anchor.textContent) === "Next courses") {
      return new URL(anchor.getAttribute("href") ?? "", listingUrl).toString();
    }
  }
  return null;
}
