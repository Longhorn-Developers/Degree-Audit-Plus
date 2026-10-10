import Button from "@/components/ui/button";
import Modal from "@/components/ui/modal";
import type { PlannerRowKey } from "@/domain/course";
import { useAuditContext } from "@/features/audit/audit-provider";
import { sendRuntimeMessage, type PlannerCourse } from "@/lib/browser/messages";
import { useEffect, useState } from "react";
import { getErrorMessage } from "./error-messages";

type Choice = "keep" | "remove";

// The planner is checked once per page, not every time the panel remounts.
let checkedThisPage = false;

export default function PlannedCoursesModal() {
  const { currentAuditId, setCurrentAuditId } = useAuditContext();
  const [open, setOpen] = useState(false);
  const [courses, setCourses] = useState<PlannerCourse[]>([]);
  const [choices, setChoices] = useState<Record<string, Choice>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const loadPlanner = async (fromLink: boolean) => {
    if (fromLink) {
      setOpen(true);
      setIsLoading(true);
      setError("");
    }

    const response = await sendRuntimeMessage({ type: "CHECK_PLANNER" }).catch(
      (error: unknown) => ({ success: false as const, error: String(error) }),
    );
    setIsLoading(false);
    if (!response?.success) {
      if (fromLink) setError(getErrorMessage(response?.error));
      return;
    }

    const accepted: Record<string, Choice> = {};
    for (const course of response.courses) {
      if (course.accepted) accepted[getRowId(course.row.key)] = "keep";
    }
    setCourses(response.courses);
    setChoices(accepted);
    if (response.courses.some((course) => !course.accepted)) setOpen(true);
  };

  useEffect(() => {
    if (checkedThisPage) return;
    checkedThisPage = true;
    void loadPlanner(false);
  }, []);

  const save = async () => {
    const keep: PlannerRowKey[] = [];
    const remove: PlannerRowKey[] = [];
    for (const { row } of courses) {
      if (choices[getRowId(row.key)] === "remove") {
        remove.push(row.key);
      } else {
        keep.push(row.key);
      }
    }

    setIsSaving(true);
    setError("");
    const response = await sendRuntimeMessage({
      type: "UPDATE_PLANNER",
      keep,
      remove,
      auditId: currentAuditId,
    }).catch((error: unknown) => ({
      success: false as const,
      error: String(error),
    }));
    setIsSaving(false);
    if (!response?.success) {
      setError(getErrorMessage(response?.error));
      return;
    }

    if (response.auditId) setCurrentAuditId(response.auditId);
    setOpen(false);
  };

  const everyRowChosen = courses.every(({ row }) => choices[getRowId(row.key)]);

  return (
    <>
      <button
        type="button"
        onClick={() => void loadPlanner(true)}
        className="text-sm font-semibold text-dap-orange hover:underline"
      >
        Manage planned courses
      </button>

      <Modal
        open={open}
        title="Courses on your UT planner"
        onClose={() => {
          if (!isSaving) setOpen(false);
        }}
        footer={
          <>
            <Button
              type="button"
              color="black"
              fill="outline"
              disabled={isSaving}
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              fill="solid"
              disabled={isLoading || isSaving || !everyRowChosen}
              onClick={() => void save()}
              className="bg-dap-plan-green hover:bg-dap-plan-green-hover text-white border-none font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </>
        }
      >
        {isLoading ? (
          <p className="text-sm text-muted">Checking your UT planner...</p>
        ) : courses.length === 0 ? (
          <p className="text-sm text-muted">Your UT planner is empty.</p>
        ) : (
          <>
            <p className="mb-4 text-sm text-text">
              Keep the courses you plan to take. Removed courses are deleted
              from your UT planner, and your audit is rerun if it counted them.
            </p>
            <div className="space-y-2">
              {courses.map(({ row }) => {
                const id = getRowId(row.key);
                return (
                  <div
                    key={id}
                    className="flex items-center justify-between gap-4 rounded-md border border-dap-border px-4 py-3"
                  >
                    <div>
                      <p className="text-text font-semibold text-sm">
                        {row.code}
                      </p>
                      <p className="text-gray-500 text-xs">
                        {row.title} · {row.semester}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="small"
                        color="black"
                        fill={choices[id] === "keep" ? "solid" : "outline"}
                        disabled={isSaving}
                        onClick={() => setChoices({ ...choices, [id]: "keep" })}
                      >
                        Keep
                      </Button>
                      <Button
                        type="button"
                        size="small"
                        color="black"
                        fill={choices[id] === "remove" ? "solid" : "outline"}
                        disabled={isSaving}
                        onClick={() =>
                          setChoices({ ...choices, [id]: "remove" })
                        }
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
        {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}
      </Modal>
    </>
  );
}

function getRowId(key: PlannerRowKey): string {
  return `${key.courseId}|${key.ccyys}|${key.seq}`;
}
