// Dev-only manual check for DAP-117: drives the extension's planner client
// end to end (extension page -> background -> UT content script -> UT) so the
// write path can be confirmed against a live session without a pasted script.
// Rendered only under import.meta.env.DEV.
import { useState } from "react";
import Button from "@/components/ui/button";
import { VStack, HStack } from "@/components/ui/stack";
import {
  sendRuntimeMessage,
  type PlannerResult,
  type PlannerRowPayload,
} from "@/lib/browser/messages";

function unwrap<T>(result: PlannerResult<T> | undefined): T {
  if (!result) throw new Error("No response from the background worker");
  if (!result.ok) throw new Error(result.error);
  return result.data;
}

const TEST_COURSE = { dept: "C S", num: "331", ccyys: "20272" };

export default function PlannerTestPanel() {
  const [log, setLog] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  // The row the last add created, so it can be removed again.
  const [lastAdded, setLastAdded] = useState<PlannerRowPayload | null>(null);

  const append = (line: string) =>
    setLog((previous) => [...previous, line].slice(-12));

  // Serialized by `busy`: two concurrent planner writes race UT's seq counter
  // and one silently overwrites the other.
  async function run(label: string, action: () => Promise<string>) {
    if (busy) return;
    setBusy(true);
    append(`${label}…`);
    try {
      append(`✅ ${await action()}`);
    } catch (error) {
      append(`❌ ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <VStack
      gap={2}
      className="w-full rounded-lg border border-dashed border-dap-primary p-4 mb-4"
    >
      <span className="text-sm font-semibold text-text">
        Planner write test (dev only) — {TEST_COURSE.dept} {TEST_COURSE.num},{" "}
        {TEST_COURSE.ccyys}
      </span>
      <span className="text-xs text-text/60">
        Runs the extension&apos;s planner client. Verify the result on UT&apos;s
        View Courses page.
      </span>

      <HStack gap={2}>
        <Button
          size="small"
          disabled={busy}
          onClick={() =>
            run("Reading planner", async () => {
              const rows = unwrap(
                await sendRuntimeMessage({ type: "PLANNER_READ_VIA_BG" }),
              );
              return rows.length
                ? `${rows.length} row(s): ${rows.map((r) => r.rowText).join(" | ")}`
                : "planner is empty";
            })
          }
        >
          Read planner
        </Button>

        <Button
          size="small"
          disabled={busy}
          onClick={() =>
            run(`Adding ${TEST_COURSE.dept} ${TEST_COURSE.num}`, async () => {
              const result = unwrap(
                await sendRuntimeMessage({
                  type: "PLANNER_ADD_VIA_BG",
                  course: TEST_COURSE,
                }),
              );
              setLastAdded(result.row);
              const topic =
                result.candidateCount > 1
                  ? ` (${result.candidateCount} add links — topic course, used the first)`
                  : "";
              return `added "${result.row.rowText}" in ${Math.round(result.elapsedMs)}ms${topic}`;
            })
          }
        >
          Add course
        </Button>

        <Button
          size="small"
          fill="outline"
          disabled={busy || !lastAdded}
          onClick={() =>
            run("Deleting", async () => {
              const result = unwrap(
                await sendRuntimeMessage({
                  type: "PLANNER_DELETE_VIA_BG",
                  row: lastAdded!,
                }),
              );
              if (result.targetGone) setLastAdded(null);
              return result.targetGone
                ? `deleted (removed ${result.removed}) in ${Math.round(result.elapsedMs)}ms`
                : `delete did NOT take — row is still in the planner`;
            })
          }
        >
          Delete last added
        </Button>
      </HStack>

      {log.length > 0 && (
        <pre className="text-xs text-text/80 whitespace-pre-wrap font-mono mt-1">
          {log.join("\n")}
        </pre>
      )}
    </VStack>
  );
}
