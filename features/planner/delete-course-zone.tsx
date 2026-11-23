import { cn } from "@/lib/utils";
import { useDroppable } from "@dnd-kit/core";
import { CircleNotchIcon, TrashIcon } from "@phosphor-icons/react";

export const DELETE_ZONE_ID = "delete-course-zone";

// True when the pointer is over the bar, measured now rather than from the
// rect dnd-kit cached when the drag started.
export function isPointerOverDeleteZone(
  pointer: { x: number; y: number } | null,
): boolean {
  const rect = document.getElementById(DELETE_ZONE_ID)?.getBoundingClientRect();
  if (!pointer || !rect) return false;
  return (
    pointer.x >= rect.left &&
    pointer.x <= rect.right &&
    pointer.y >= rect.top &&
    pointer.y <= rect.bottom
  );
}

export type DeleteZoneState =
  | { status: "idle" }
  // a planned course is being dragged, so it can be dropped here
  | { status: "dragging" }
  | { status: "deleting"; code: string }
  | { status: "error"; message: string };

// The bar along the bottom of the planner that planned courses are dropped on
// to delete them. It also reports the delete while UT reruns the audit.
export default function DeleteCourseZone({
  state,
}: {
  state: DeleteZoneState;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: DELETE_ZONE_ID,
    disabled: state.status !== "dragging",
  });
  const hidden = state.status === "idle";
  const releasing = state.status === "dragging" && isOver;

  // The drop target never moves, so its hitbox is the whole bar even while
  // the bar inside it is still sliding up.
  return (
    <div
      ref={setNodeRef}
      id={DELETE_ZONE_ID}
      role="status"
      aria-hidden={hidden}
      className={cn(
        "fixed right-0 bottom-0 left-[var(--sidebar-width,0px)] z-10 h-24 overflow-hidden transition-[left] duration-300 ease-out",
        hidden && "pointer-events-none",
      )}
    >
      <div
        className={cn(
          "flex h-full items-center justify-center gap-2 border-t-2 border-red-700 text-base font-semibold text-red-700 transition-[translate,background-color] duration-200 ease-out",
          releasing ? "bg-red-200" : "bg-dap-red-bg",
          hidden ? "translate-y-full" : "translate-y-0",
        )}
      >
        {state.status === "deleting" ? (
          <>
            <CircleNotchIcon size={20} className="animate-spin" />
            Removing {state.code} from your UT planner...
          </>
        ) : state.status === "error" ? (
          <>
            <TrashIcon size={20} />
            {state.message}
          </>
        ) : (
          <>
            <TrashIcon size={20} weight={releasing ? "fill" : "regular"} />
            {releasing ? "Release to delete" : "Drag here to delete course"}
          </>
        )}
      </div>
    </div>
  );
}
