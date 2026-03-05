import type {
  AuditRequirement,
  Course,
  CourseId,
  CurrentAuditProgress,
} from "./general-types";

// export function calculateWeightedDegreeCompletion(
//   sections: AuditRequirement[],
//   courses: Record<CourseId, Course>,
// ): CurrentAuditProgress {
//   console.log("[Audit Calculations] sections", sections);
//   const results: CurrentAuditProgress = {
//     total: { current: 0, planned: 0, total: 0 },
//     sections: [],
//   };
//   console.log("sections", sections);
//   sections.forEach((section) => {
//     const sectionProgress = {
//       current: 0,
//       planned: 0,
//       total: 0,
//     };

//     for (const rule of section.rules) {
//       sectionProgress.total += rule.requiredHours;
//       results.total.total += rule.requiredHours;
//       for (const courseId of rule.courses) {
//         const hours = courses[courseId].hours;
//         switch (courses[courseId].status) {
//           case "Planned":
//             sectionProgress.planned += hours;
//             break;
//           case "Completed":
//             sectionProgress.current += hours;
//             break;
//           case "In Progress":
//             sectionProgress.current += hours;
//             break;
//         }
//       }
//     }

//     results.sections.push({
//       title: section.title,
//       progress: sectionProgress,
//     });
//   });
//   console.log("[Audit Calculations] results", results);
//   return results;
// }

export function calculateWeightedDegreeCompletion(
  sections: AuditRequirement[],
  courses: Record<CourseId, Course>,
): CurrentAuditProgress {
  const results: CurrentAuditProgress = {
    total: { current: 0, planned: 0, total: 0 },
    sections: [],
  };
  console.log("sections", sections);
  sections.forEach((section) => {
    const sectionProgress = {
      title: section.title,
      progress: { current: 0, planned: 0, total: 0 },
    };
    sectionProgress.progress.total = section.rules.reduce(
      (acc, rule) => acc + rule.requiredHours,
      0,
    );

    section.rules.forEach((rule) => {
      sectionProgress.progress.current += rule.appliedHours;
      rule.courses.forEach((courseId) => {
        const hours = courses[courseId].hours;
        if (courses[courseId].status === "Planned") {
          results.total.planned += hours;
          sectionProgress.progress.planned += hours;
        }
      });
    });

    results.sections.push(sectionProgress);
  });
  results.total.current = results.sections.reduce(
    (acc, section) => acc + section.progress.current,
    0,
  );
  results.total.total = results.sections.reduce(
    (acc, section) => acc + section.progress.total,
    0,
  );
  console.log("[Audit Calculations] results", results);
  return results;
}
