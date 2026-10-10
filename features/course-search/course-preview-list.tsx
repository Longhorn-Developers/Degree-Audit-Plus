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
import { cn } from "@/lib/utils";
import { useRef, useState } from "react";
import CourseCard from "./course-card";
import { getErrorMessage } from "./error-messages";

const PREVIEW_TERM = semesterToCcyys(nextSemester(getCurrentSemester()));

type Preview =
  | { status: "idle" }
  | { status: "loading" }
  // auditId is the audit the preview was compared with
  | { status: "done"; result: CoursePreview; auditId: string }
  | { status: "adding"; result: CoursePreview; auditId: string }
  | { status: "added" }
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
  const { currentAuditId, setCurrentAuditId } = useAuditContext();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [preview, setPreview] = useState<Preview>({ status: "idle" });
  const latest = useRef(0);

  const previewCourse = async (course: CatalogCourse) => {
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
    setPreview(
      response?.success
        ? { status: "done", result: response, auditId }
        : { status: "error", error: getErrorMessage(response?.error) },
    );
  };

  const acceptPreview = async (result: CoursePreview, auditId: string) => {
    const request = latest.current;
    setPreview({ status: "adding", result, auditId });

    // the audit the preview was made on, even if another one is open now
    const response = await sendRuntimeMessage({
      type: "ACCEPT_PREVIEW",
      auditId,
    }).catch((error: unknown) => ({
      success: false as const,
      error: String(error),
    }));
    if (response?.success) setCurrentAuditId(response.auditId);

    if (request !== latest.current) return;
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
        onAccept={(result, auditId) => void acceptPreview(result, auditId)}
      />
    </div>
  );
}

function listCourses(codes: string[]): string {
  if (codes.length === 1) return codes[0];
  return `${codes.slice(0, -1).join(", ")} and ${codes[codes.length - 1]}`;
}

function PreviewResult({
  preview,
  onAccept,
}: {
  preview: Preview;
  onAccept: (result: CoursePreview, auditId: string) => void;
}) {
  if (preview.status === "idle") return null;

  if (preview.status === "loading") {
    return (
      <div className="mt-4">
        <p className="text-sm text-text mb-2">
          Checking degree requirements...
        </p>
        <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
          <div className="h-full w-2/3 rounded-full bg-dap-plan-green animate-pulse" />
        </div>
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
  return (
    <div className="mt-4 space-y-1 rounded-md border border-dap-plan-green bg-dap-plan-green/10 px-4 py-3 text-sm text-text">
      <p className="text-xs">Compared with your {degree} audit</p>
      {rules.length === 0 ? (
        <p>Does not count toward any requirement.</p>
      ) : (
        rules.map((rule) => {
          // UT can move another course off a rule to make room for this one.
          const change = rule.appliedAfter - rule.appliedBefore;
          return (
            <p key={`${rule.requirement}|${rule.rule}`}>
              {change > 0 ? "Adds" : "Removes"} {Math.abs(change)}{" "}
              {rule.unit === "hours" ? "credit hour" : "course"}
              {Math.abs(change) === 1 ? "" : "s"} {change > 0 ? "to" : "from"}{" "}
              <span className="font-semibold">
                {rule.requirement}: {rule.rule}
              </span>
            </p>
          );
        })
      )}
      <p>
        New progress: <span className="font-semibold">{progress.after}%</span>{" "}
        (was {progress.before}%)
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
        onClick={() => onAccept(preview.result, preview.auditId)}
        className="mt-2 w-full h-10 bg-dap-plan-green hover:bg-dap-plan-green-hover text-white border-none rounded-md font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {adding ? "Adding..." : "Add to plan"}
      </Button>
    </div>
  );
}
