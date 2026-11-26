import Button from "@/components/ui/button";
import Modal from "@/components/ui/modal";
import { Grid } from "@/components/ui/stack";
import { useAuditContext } from "@/features/audit/audit-provider";
import {
  CourseId,
  isDeletableCourse,
  nextSemester,
  sortSemesters,
  StringSemester,
} from "@/domain/course";
import {
  DndContext,
  DragOverEvent,
  DragOverlay,
  pointerWithin,
} from "@dnd-kit/core";
import { getErrorMessage } from "@/features/course-search/error-messages";
import { cn } from "@/lib/utils";
import { PlusIcon } from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import DeleteCourseZone, {
  DELETE_ZONE_ID,
  isPointerOverDeleteZone,
  type DeleteZoneState,
} from "./delete-course-zone";
import PlannerCourseCard from "./planner-course-card";
import SemesterCard from "./semester-card";

const SemesterDropdowns = () => {
  const { courseMap, semesters, moveCourseToNewSemester, deletePlannedCourse } =
    useAuditContext();
  const [extraEmptySemesters, setExtraEmptySemesters] = useState<
    StringSemester[]
  >([]);
  const [activeDragId, setActiveDragId] = useState<CourseId | null>(null);
  const [dragSemester, setDragSemester] = useState<StringSemester | null>(null);
  const [isOverDelete, setIsOverDelete] = useState(false);
  const [deleteState, setDeleteState] = useState<DeleteZoneState>({
    status: "idle",
  });
  const [deletingId, setDeletingId] = useState<CourseId | null>(null);
  const [confirmingId, setConfirmingId] = useState<CourseId | null>(null);
  const confirmingCourse = confirmingId ? courseMap[confirmingId] : undefined;

  useEffect(() => {
    if (deletingId && !courseMap[deletingId]) setDeletingId(null);
  }, [courseMap, deletingId]);

  useEffect(() => {
    if (deleteState.status !== "error") return;
    const timeout = setTimeout(() => setDeleteState({ status: "idle" }), 6000);
    return () => clearTimeout(timeout);
  }, [deleteState]);

  const combined = useMemo(() => {
    const combined = structuredClone(semesters);
    if (deletingId) {
      for (const semester of Object.keys(combined) as StringSemester[]) {
        combined[semester] = combined[semester].filter(
          ({ id }) => id !== deletingId,
        );
      }
    }
    extraEmptySemesters.forEach((semester) => {
      if (!(semester in semesters)) combined[semester] = [];
    });

    const activeCourse = activeDragId ? courseMap[activeDragId] : null;
    if (
      activeCourse &&
      dragSemester &&
      dragSemester !== activeCourse.semester
    ) {
      combined[activeCourse.semester] = combined[activeCourse.semester].filter(
        ({ id }) => id !== activeDragId,
      );
      combined[dragSemester] = [
        ...(combined[dragSemester] ?? []),
        activeCourse,
      ];
    }
    return combined;
  }, [
    activeDragId,
    courseMap,
    deletingId,
    dragSemester,
    extraEmptySemesters,
    semesters,
  ]);

  function onDragOver(event: DragOverEvent) {
    const activeId = event.active.id;
    if (typeof activeId !== "string") return;

    const overId = event.over?.id;
    setIsOverDelete(overId === DELETE_ZONE_ID);
    if (overId === DELETE_ZONE_ID) {
      setDragSemester(courseMap[activeId]?.semester ?? null);
      return;
    }
    if (
      typeof overId === "string" &&
      !courseMap[overId] &&
      dragSemester !== overId
    ) {
      setDragSemester(overId as StringSemester);
    }
  }

  function clearDrag() {
    setActiveDragId(null);
    setDragSemester(null);
    setIsOverDelete(false);
    setDeleteState((state) =>
      state.status === "dragging" ? { status: "idle" } : state,
    );
  }

  async function deleteCourse(courseId: CourseId) {
    const course = courseMap[courseId];
    if (!isDeletableCourse(course) || deleteState.status === "deleting") return;
    setDeletingId(courseId);
    setDeleteState({ status: "deleting", code: course.code });
    const result = await deletePlannedCourse(courseId);
    if (result.ok) {
      setDeleteState({ status: "idle" });
      return;
    }
    setDeletingId(null);
    setDeleteState({ status: "error", message: getErrorMessage(result.error) });
  }

  return (
    <DndContext
      id="degree-planner-general"
      onDragStart={(event) => {
        if (typeof event.active.id !== "string") return;
        const course = courseMap[event.active.id];
        setActiveDragId(event.active.id);
        setDragSemester(course?.semester ?? null);
        if (isDeletableCourse(course) && deleteState.status !== "deleting") {
          setDeleteState({ status: "dragging" });
        }
      }}
      onDragEnd={(event) => {
        const activeId = event.active.id;
        const overId = event.over?.id;
        if (typeof activeId === "string" && overId === DELETE_ZONE_ID) {
          clearDrag();
          void deleteCourse(activeId);
          return;
        }
        if (
          typeof activeId === "string" &&
          typeof overId === "string" &&
          !courseMap[overId] &&
          courseMap[activeId]?.semester !== overId
        ) {
          void moveCourseToNewSemester(activeId, overId as StringSemester)
            .catch((error) => console.error("Failed to move course:", error))
            .finally(clearDrag);
          return;
        }
        clearDrag();
      }}
      onDragCancel={clearDrag}
      onDragOver={onDragOver}
      collisionDetection={(args) => {
        if (
          deleteState.status === "dragging" &&
          isPointerOverDeleteZone(args.pointerCoordinates)
        ) {
          return [{ id: DELETE_ZONE_ID }];
        }
        return pointerWithin({
          ...args,
          droppableContainers: args.droppableContainers.filter(
            (container) =>
              container.id !== args.active.id &&
              container.id !== DELETE_ZONE_ID &&
              !(container.id in courseMap),
          ),
        });
      }}
    >
      <Grid className="w-full pb-32" maxCols={2}>
        {Object.entries(combined)
          .sort((a, b) =>
            sortSemesters(a[0] as StringSemester, b[0] as StringSemester),
          )
          .map((semester, index) => (
            <SemesterCard
              key={index}
              semester={semester[0] as StringSemester}
              courses={semester[1]}
              isDragging={!!activeDragId}
              onDeleteCourse={
                deleteState.status === "deleting" ? undefined : setConfirmingId
              }
            />
          ))}
        <Button
          className="w-full self-start gap-3 rounded-md bg-dap-plan-green text-lg font-bold"
          onClick={() => {
            setExtraEmptySemesters((prev) => [
              ...prev,
              nextSemester(
                Object.keys(combined).sort((a, b) =>
                  sortSemesters(a as StringSemester, b as StringSemester),
                )[Object.keys(combined).length - 1] as StringSemester,
              ),
            ]);
          }}
        >
          <PlusIcon size={22} />
          Add Future Semester
        </Button>
      </Grid>
      <DragOverlay>
        {activeDragId ? (
          <PlannerCourseCard
            className={cn(
              "cursor-grabbing transition-transform duration-150",
              isOverDelete &&
                "-rotate-6 border-dashed border-red-700 bg-dap-red-bg",
            )}
            courseId={activeDragId}
            showDots
          />
        ) : null}
      </DragOverlay>
      <DeleteCourseZone state={deleteState} />
      <Modal
        open={!!confirmingCourse}
        title="Remove course?"
        onClose={() => setConfirmingId(null)}
        footer={
          <>
            <Button
              color="black"
              fill="outline"
              onClick={() => setConfirmingId(null)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                setConfirmingId(null);
                if (confirmingId) void deleteCourse(confirmingId);
              }}
            >
              Remove
            </Button>
          </>
        }
      >
        <p className="text-base text-text">
          Remove {confirmingCourse?.code} ({confirmingCourse?.semester}) from
          your UT planner? Your audit will rerun if it counted this course.
        </p>
      </Modal>
    </DndContext>
  );
};

export default SemesterDropdowns;
