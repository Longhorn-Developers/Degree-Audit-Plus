import Button from "@/components/ui/button";
import { Grid } from "@/components/ui/stack";
import { useAuditContext } from "@/features/audit/audit-provider";
import {
  CourseId,
  SemesterSeason,
  StringSemester,
  Year,
} from "@/domain/course";
import {
  DndContext,
  DragOverEvent,
  DragOverlay,
  pointerWithin,
} from "@dnd-kit/core";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import CourseCard from "./course-card";
import SemesterCard from "./semester-card";

export function sortSemesters(
  sem_a: StringSemester,
  sem_b: StringSemester,
): number {
  const [season_a, year_a] = sem_a.split(" ");
  const [season_b, year_b] = sem_b.split(" ");
  const a = {
    season: season_a === "Spring" ? 1 : season_a === "Summer" ? 2 : 3,
    year: Number(year_a),
  };
  const b = {
    season: season_b === "Spring" ? 1 : season_b === "Summer" ? 2 : 3,
    year: Number(year_b),
  };

  const diff = a.year - b.year;
  if (diff !== 0) return diff;
  return a.season - b.season;
}

function nextSemester(semester: StringSemester): StringSemester {
  const [season, year] = semester.split(" ") as [SemesterSeason, Year];
  switch (season) {
    case "Spring":
      return `Summer ${year}` as StringSemester;
    case "Fall":
      return `Spring ${Number(year) + 1}` as StringSemester;
    case "Summer":
      return `Fall ${year}` as StringSemester;
  }
}

const SemesterDropdowns = () => {
  const { courseMap, semesters, moveCourseToNewSemester } = useAuditContext();
  const [extraEmptySemesters, setExtraEmptySemesters] = useState<
    StringSemester[]
  >([]);
  const [activeDragId, setActiveDragId] = useState<CourseId | null>(null);
  const [dragOrigin, setDragOrigin] = useState<StringSemester | null>(null);
  const combined = useMemo(() => {
    const combined = structuredClone(semesters);
    extraEmptySemesters.forEach((semester) => {
      if (!(semester in semesters)) combined[semester] = [];
    });
    return combined;
  }, [semesters, extraEmptySemesters]);

  function onDragOver(event: DragOverEvent) {
    const activeId = event.active.id;
    if (typeof activeId !== "string") return;

    const overId = event.over?.id;
    if (
      typeof overId === "string" &&
      !courseMap[overId] &&
      courseMap[activeId]?.semester !== overId
    ) {
      void moveCourseToNewSemester(activeId, overId as StringSemester);
    } else if (!event.over && courseMap[activeId]?.semester !== dragOrigin) {
      void moveCourseToNewSemester(activeId, dragOrigin as StringSemester);
    }
  }

  return (
    <DndContext
      id="degree-planner-general"
      onDragStart={(event) => {
        if (typeof event.active.id !== "string") return;
        setDragOrigin(courseMap[event.active.id]?.semester);
        setActiveDragId(event.active.id);
      }}
      onDragEnd={() => {
        setDragOrigin(null);
        setActiveDragId(null);
      }}
      onDragOver={onDragOver}
      collisionDetection={(args) =>
        pointerWithin({
          ...args,
          droppableContainers: args.droppableContainers.filter(
            (container) =>
              container.id !== args.active.id && !(container.id in courseMap),
          ),
        })
      }
    >
      <Grid className="w-full" maxCols={2}>
        {Object.entries(combined)
          .sort((a, b) =>
            sortSemesters(a[0] as StringSemester, b[0] as StringSemester),
          )
          .map((semester, index) => (
            <SemesterCard
              key={index}
              semester={semester[0] as StringSemester}
              courses={semester[1]}
            />
          ))}
        <Button
          className="w-full bg-[#579D42] text-white font-bold"
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
          <Plus />
          Add Future Semester
        </Button>
      </Grid>
      <DragOverlay>
        {activeDragId ? (
          <CourseCard
            className="cursor-grabbing"
            courseId={activeDragId}
            showDots
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default SemesterDropdowns;
