// dev only buttons for poking the planner bridge from the extension page
// ui -> background -> ut tab -> planner client, check the result on ut's
// view courses page. never rendered in production builds
import { useState } from "react";
import Button from "@/components/ui/button";
import { HStack, VStack } from "@/components/ui/stack";
import type { PlannedCourseRow } from "@/domain/planner";
import { sendRuntimeMessage, type PlannerResult } from "@/lib/browser/messages";

function unwrap<T>(result: PlannerResult<T> | undefined): T {
  if (!result) throw new Error("no reply from the background");
  if (!result.ok) throw new Error(result.code);
  return result.data;
}

function describeRow(row: PlannedCourseRow): string {
  return `${row.code} ${row.semester} seq ${row.key.seq}`;
}

export default function PlannerTestPanel() {
  const [department, setDepartment] = useState("ADV");
  const [number, setNumber] = useState("303");
  const [ccyys, setCcyys] = useState("20272");
  const [lastAdded, setLastAdded] = useState<PlannedCourseRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  const append = (line: string) =>
    setLog((previous) => [...previous, line].slice(-12));

  async function run(label: string, action: () => Promise<string>) {
    if (busy) return;
    setBusy(true);
    append(`${label}...`);
    try {
      append(`ok: ${await action()}`);
    } catch (error) {
      append(
        `error: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      setBusy(false);
    }
  }

  const read = () =>
    run("reading planner", async () => {
      const rows = unwrap(await sendRuntimeMessage({ type: "PLANNER_READ" }));
      if (rows.length === 0) return "planner is empty";
      return rows.map(describeRow).join(" | ");
    });

  const add = () =>
    run(`adding ${department} ${number}`, async () => {
      const resolution = unwrap(
        await sendRuntimeMessage({
          type: "PLANNER_RESOLVE",
          course: { department, number, ccyys },
        }),
      );
      if (resolution.kind === "topics") {
        return `topic course, ${resolution.options.length} topics, pick one manually`;
      }
      const row = unwrap(
        await sendRuntimeMessage({
          type: "PLANNER_ADD",
          link: resolution.link,
        }),
      );
      setLastAdded(row);
      return `added ${describeRow(row)}`;
    });

  const remove = () =>
    run("deleting last added", async () => {
      if (!lastAdded) return "nothing to delete";
      unwrap(
        await sendRuntimeMessage({
          type: "PLANNER_DELETE",
          key: lastAdded.key,
        }),
      );
      setLastAdded(null);
      return `deleted ${describeRow(lastAdded)}`;
    });

  const clear = () =>
    run("syncing planner to empty", async () => {
      const rows = unwrap(
        await sendRuntimeMessage({ type: "PLANNER_SYNC", targets: [] }),
      );
      setLastAdded(null);
      return `planner now has ${rows.length} rows`;
    });

  const field = (
    label: string,
    value: string,
    onChange: (value: string) => void,
  ) => (
    <label className="text-xs text-text/60">
      {label}{" "}
      <input
        className="w-20 rounded border border-text/20 px-1 text-text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );

  return (
    <VStack
      gap={2}
      className="w-full rounded-lg border border-dashed border-dap-primary p-4 mb-4"
    >
      <span className="text-sm font-semibold text-text">
        planner bridge test (dev only)
      </span>
      <HStack gap={3}>
        {field("dept", department, setDepartment)}
        {field("number", number, setNumber)}
        {field("ccyys", ccyys, setCcyys)}
      </HStack>
      <HStack gap={2}>
        <Button size="small" disabled={busy} onClick={read}>
          read
        </Button>
        <Button size="small" disabled={busy} onClick={add}>
          add
        </Button>
        <Button
          size="small"
          fill="outline"
          disabled={busy || !lastAdded}
          onClick={remove}
        >
          delete last added
        </Button>
        <Button size="small" fill="outline" disabled={busy} onClick={clear}>
          sync to empty
        </Button>
      </HStack>
      {log.length > 0 && (
        <pre className="mt-1 whitespace-pre-wrap font-mono text-xs text-text/80">
          {log.join("\n")}
        </pre>
      )}
    </VStack>
  );
}
