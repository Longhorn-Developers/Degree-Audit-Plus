import Button from "@/components/ui/button";
import type { CatalogCourse } from "@/domain/catalog";
import {
  getCurrentSemester,
  nextSemester,
  semesterToCcyys,
} from "@/domain/course";
import { useAuditContext } from "@/features/audit/audit-provider";
import { mapCatalogCourseToPreview } from "@/features/catalog/catalog-course-mappers";
import { sendRuntimeMessage, type CoursePreview } from "@/lib/browser/messages";
import { capPercentage, cn } from "@/lib/utils";
import { CheckIcon, InfoIcon, MinusIcon } from "@phosphor-icons/react";
import { useEffect, useMemo, useRef, useState } from "react";
import CourseCard from "./course-card";
import { getErrorMessage } from "./error-messages";

const PREVIEW_TERM = semesterToCcyys(nextSemester(getCurrentSemester()));

function normalize(text: string): string {
  return text.replace(/\s+/g, " ").trim().toUpperCase();
}

function courseKey(code: string, title: string): string {
  return `${normalize(code)}|${normalize(title)}`;
}

function findCoursesInAudit(
  courses: CatalogCourse[],
  auditCourses: { code: string; name: string }[],
): Set<number> {
  const planned = new Set(
    auditCourses.map(({ code, name }) => courseKey(code, name)),
  );
  const found = new Set<number>();
  for (const course of courses) {
    const code = `${course.department} ${course.number}`;
    if (planned.has(courseKey(code, course.courseName))) {
      found.add(course.uniqueId);
    }
  }
  return found;
}

type Preview =
  | { status: "idle" }
  | { status: "loading" }
  // auditId is the audit the preview was compared with, courseId the course
  | { status: "done"; result: CoursePreview; auditId: string; courseId: number }
  | {
      status: "adding";
      result: CoursePreview;
      auditId: string;
      courseId: number;
    }
  | { status: "added" }
  | { status: "taken" }
  | { status: "error"; error: string };

// A list of courses. Clicking one asks UT what it would fulfill and shows the
// answer under the list. Clicking another drops the first request.
export default function CoursePreviewList({
  courses,
  className,
}: {
  courses: CatalogCourse[];
  className?: string;
}) {
  const { currentAuditId, setCurrentAuditId, courseMap } = useAuditContext();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [preview, setPreview] = useState<Preview>({ status: "idle" });
  const [addedIds, setAddedIds] = useState<ReadonlySet<number>>(new Set());
  const inAuditIds = useMemo(
    () =>
      findCoursesInAudit(
        courses,
        Object.values(courseMap).filter(({ status }) => status === "Planned"),
      ),
    [courses, courseMap],
  );
  const isAdded = (course: CatalogCourse) =>
    addedIds.has(course.uniqueId) || inAuditIds.has(course.uniqueId);
  const latest = useRef(0);
  // refs, not state, so a double click in the same frame is still caught
  const shownCourse = useRef<number | null>(null);
  const isAdding = useRef(false);
  const acceptedAuditId = useRef<string | null>(null);

  // audit changed elsewhere so the preview is stale; skip our own Add to plan
  useEffect(() => {
    const accepted = currentAuditId === acceptedAuditId.current;
    acceptedAuditId.current = null;
    if (accepted) return;
    latest.current++;
    shownCourse.current = null;
    setSelectedId(null);
    setPreview({ status: "idle" });
  }, [currentAuditId]);

  const previewCourse = async (course: CatalogCourse) => {
    // the course already loading or shown, clicking another one still switches
    if (shownCourse.current === course.uniqueId) return;
    if (isAdded(course)) return;
    shownCourse.current = course.uniqueId;
    const request = ++latest.current;
    const auditId = currentAuditId;
    const name = `${course.department} ${course.number}`;
    console.log(`Preview ${name}: started`);
    setSelectedId(course.uniqueId);
    setPreview({ status: "loading" });

    const response = await sendRuntimeMessage({
      type: "PREVIEW_COURSE",
      course: {
        department: course.department,
        number: course.number,
        ccyys: PREVIEW_TERM,
      },
      auditId,
    }).catch((error: unknown) => ({
      success: false as const,
      error: String(error),
    }));
    if (response?.success) {
      for (const [step, ms] of Object.entries(response.steps ?? {})) {
        console.log(`Preview ${name}: ${step} ${ms} ms`);
      }
      console.log(`Preview ${name}: diff`, response.diff);
    } else {
      console.log(`Preview ${name}: failed`, response?.error);
    }

    // A newer click owns the panel now.
    if (request !== latest.current) return;
    if (!response?.success) shownCourse.current = null;
    if (response?.success) {
      setPreview({
        status: "done",
        result: response,
        auditId,
        courseId: course.uniqueId,
      });
    } else if (response?.error === "ALREADY_TAKEN") {
      setPreview({ status: "taken" });
    } else {
      setPreview({ status: "error", error: getErrorMessage(response?.error) });
    }
  };

  const acceptPreview = async (
    result: CoursePreview,
    auditId: string,
    courseId: number,
  ) => {
    if (isAdding.current) return;
    isAdding.current = true;
    const request = latest.current;
    setPreview({ status: "adding", result, auditId, courseId });

    // the audit the preview was made on, even if another one is open now
    const response = await sendRuntimeMessage({
      type: "ACCEPT_PREVIEW",
      auditId,
    }).catch((error: unknown) => ({
      success: false as const,
      error: String(error),
    }));
    isAdding.current = false;
    if (response?.success) {
      acceptedAuditId.current = response.auditId;
      setCurrentAuditId(response.auditId);
      setAddedIds((ids) => new Set(ids).add(courseId));
    }

    if (request !== latest.current) return;
    shownCourse.current = null;
    setPreview(
      response?.success
        ? { status: "added" }
        : { status: "error", error: getErrorMessage(response?.error) },
    );
  };

  return (
    <div>
      <div className={cn("space-y-2", className)}>
        {courses.map((course) => (
          <CourseCard
            key={course.uniqueId}
            course={mapCatalogCourseToPreview(course)}
            type="add"
            loading={
              preview.status === "loading" && course.uniqueId === selectedId
            }
            added={isAdded(course)}
            onClick={() => void previewCourse(course)}
            className={cn(
              "w-full",
              course.uniqueId === selectedId && "border-dap-plan-green",
            )}
          />
        ))}
      </div>
      <PreviewResult
        preview={preview}
        onAccept={(result, auditId, courseId) =>
          void acceptPreview(result, auditId, courseId)
        }
      />
    </div>
  );
}

function listCourses(codes: string[]): string {
  if (codes.length === 1) return codes[0];
  return `${codes.slice(0, -1).join(", ")} and ${codes[codes.length - 1]}`;
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 rounded-md border border-gray-400 bg-gray-50 px-3 py-2 text-sm text-text">
      <InfoIcon size={18} className="shrink-0 text-gray-500" />
      <p>{children}</p>
    </div>
  );
}

function PreviewResult({
  preview,
  onAccept,
}: {
  preview: Preview;
  onAccept: (result: CoursePreview, auditId: string, courseId: number) => void;
}) {
  if (preview.status === "idle") return null;

  if (preview.status === "loading") {
    return (
      <p className="mt-4 text-sm text-text">Checking degree requirements...</p>
    );
  }

  if (preview.status === "taken") {
    return (
      <div className="mt-4">
        <InfoBox>You've taken this class already</InfoBox>
      </div>
    );
  }

  if (preview.status === "error") {
    return <p className="mt-4 text-sm text-red-700">{preview.error}</p>;
  }

  if (preview.status === "added") {
    return (
      <p className="mt-4 text-sm text-text">
        Added to your plan. Your audit now includes it.
      </p>
    );
  }

  const { diff, degree, missingPlanned, removedPlanned } = preview.result;
  const { rules, progress } = diff;
  const adding = preview.status === "adding";
  const beforeFormattedPercentage = capPercentage(progress.before);
  const afterFormattedPercentage = capPercentage(progress.after);

  return (
    <div className="mt-4 space-y-2 text-sm text-text">
      {rules.length === 0 ? (
        <InfoBox>Doesn't fulfill any degree requirements</InfoBox>
      ) : (
        rules.map((rule) => {
          // UT can move another course off a rule to make room for this one.
          const change = rule.appliedAfter - rule.appliedBefore;
          const adds = change > 0;
          const Icon = adds ? CheckIcon : MinusIcon;
          return (
            <div
              key={`${rule.requirement}|${rule.rule}`}
              className={cn(
                "flex items-center gap-2.5 rounded-md border px-3 py-2",
                adds
                  ? "border-dap-plan-green bg-dap-plan-green/10"
                  : "border-gray-300 bg-gray-50",
              )}
            >
              <Icon
                size={18}
                className={cn(
                  "shrink-0",
                  adds ? "text-dap-plan-green" : "text-gray-500",
                )}
              />
              <p className="text-sm">
                {adds ? "Adds" : "Removes"} {Math.abs(change)}{" "}
                {rule.unit === "hours" ? "credit hour" : "course"}
                {Math.abs(change) === 1 ? "" : "s"} {adds ? "to" : "from"}{" "}
                {rule.requirement}: {rule.rule}
              </p>
            </div>
          );
        })
      )}
      <p>
        <span className="text-gray-600">Degree progress:</span>{" "}
        <span className="text-gray-500">{beforeFormattedPercentage}%</span> →{" "}
        <span className="font-semibold">{afterFormattedPercentage}%</span>
      </p>
      {missingPlanned.length > 0 && (
        <p className="text-xs">
          These changes also count {listCourses(missingPlanned)}, which{" "}
          {missingPlanned.length === 1 ? "is" : "are"} on your UT planner but
          not in your {degree} audit. Run a new audit to see just this course.
        </p>
      )}
      {removedPlanned.length > 0 && (
        <p className="text-xs">
          {listCourses(removedPlanned)}{" "}
          {removedPlanned.length === 1 ? "is" : "are"} planned in your {degree}{" "}
          audit but no longer on your UT planner. Run a new audit to see just
          this course.
        </p>
      )}
      <Button
        type="button"
        fill="solid"
        disabled={adding}
        onClick={() =>
          onAccept(preview.result, preview.auditId, preview.courseId)
        }
        className="mt-2 w-full h-10 bg-dap-plan-green hover:bg-dap-plan-green-hover text-white border-none rounded-md font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {adding ? "Adding..." : "Add to plan"}
      </Button>
    </div>
  );
}
