import type { AuditDiff } from "@/domain/audit";
import type { CatalogCourse } from "@/domain/catalog";
import { semesterToCcyys } from "@/domain/course";
import { useAuditContext } from "@/features/audit/audit-provider";
import { mapCatalogCourseToPreview } from "@/features/catalog/catalog-course-mappers";
import { sendRuntimeMessage } from "@/lib/browser/messages";
import { cn } from "@/lib/utils";
import { useRef, useState } from "react";
import CourseCard from "./course-card";

// TODO: plan into the student's next semester instead of a fixed term.
const PREVIEW_TERM = semesterToCcyys("Fall 2027");

type Preview =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; diff: AuditDiff }
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
  const { currentAuditId } = useAuditContext();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [preview, setPreview] = useState<Preview>({ status: "idle" });
  const latest = useRef(0);

  const previewCourse = async (course: CatalogCourse) => {
    const request = ++latest.current;
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
      mainAuditId: currentAuditId,
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
        ? { status: "done", diff: response.diff }
        : { status: "error", error: response?.error ?? "No response" },
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
      <PreviewResult preview={preview} />
    </div>
  );
}

function PreviewResult({ preview }: { preview: Preview }) {
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
    return (
      <p className="mt-4 text-sm text-red-700">
        Could not check this course ({preview.error}).
      </p>
    );
  }

  const { rules, progress } = preview.diff;
  return (
    <div className="mt-4 space-y-1 rounded-md border border-dap-plan-green bg-green-50 px-4 py-3 text-sm text-text">
      {rules.length === 0 ? (
        <p>Does not count toward any requirement.</p>
      ) : (
        rules.map((rule) => (
          <p key={`${rule.requirement}|${rule.rule}`}>
            Adds {rule.appliedAfter - rule.appliedBefore}{" "}
            {rule.unit === "hours" ? "credit hours" : "courses"} to{" "}
            <span className="font-semibold">
              {rule.requirement}: {rule.rule}
            </span>
          </p>
        ))
      )}
      <p>
        New progress: <span className="font-semibold">{progress.after}%</span>{" "}
        (was {progress.before}%)
      </p>
    </div>
  );
}
