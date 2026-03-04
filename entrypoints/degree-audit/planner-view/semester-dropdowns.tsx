import Button from "@/entrypoints/components/common/button";
import { Wrap } from "@/entrypoints/components/common/helperdivs";
import CourseCard from "@/entrypoints/components/course-card";
import { CourseId, StringSemester } from "@/lib/general-types";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
} from "@dnd-kit/core";
import { Plus } from "lucide-react";
import { useState } from "react";
import SemesterCard from "../components/semester-card";
import { useAuditContext } from "../providers/audit-provider";

function sortSemesters(sem_a: StringSemester, sem_b: StringSemester): number {
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

  return a.year === b.year ? a.season - b.season : a.year - b.year;
}

function nextSemester(semester: StringSemester): StringSemester {
  const [season, year] = semester.split(" ");
  if (season === "Spring") {
    return `Fall ${Number(year) + 1}` as StringSemester;
  }
  if (season === "Fall") {
    return `Spring ${year}` as StringSemester;
  }
  throw new Error(`Invalid semester: ${semester}`);
}

const SemesterDropdowns = () => {
  const { courseMap, semesters, moveCourseToNewSemester } = useAuditContext();
  const [extraEmptySemesters, setExtraEmptySemesters] = useState<
    StringSemester[]
  >([]);
  const [activeDragId, setActiveDragId] = useState<CourseId | null>(null);

  const onDragOver = (event: DragOverEvent) => {
    console.log("onDragOver", event);
    if (event.over?.id && !(event.over.id in courseMap)) {
      moveCourseToNewSemester(event.active.id, event.over.id as StringSemester);
    }
  };

  const onDragStart = (event: DragStartEvent) => {
    console.log("onDragStart", event);
    setActiveDragId(event.active.id);
  };

  const onDragEnd = (event: DragEndEvent) => {
    setActiveDragId(null);
    console.log("onDragEnd", event);
    const activeId: CourseId = event.active.id;
    const overId = event.over?.id;

    if (!overId) {
      return;
    }

    moveCourseToNewSemester(activeId, overId as StringSemester);
  };

  return (
    <DndContext
      id="degree-planner-general"
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
    >
      <Wrap maxCols={2}>
        {Object.entries(semesters)
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
          className="w-sm bg-[#579D42] text-white font-bold"
          onClick={() => {
            setExtraEmptySemesters([
              ...extraEmptySemesters,
              nextSemester(
                Object.keys(semesters)[
                  Object.keys(semesters).length - 1
                ] as StringSemester,
              ),
            ]);
          }}
        >
          <Plus />
          Add Future Semester
        </Button>
      </Wrap>
      <DragOverlay>
        {activeDragId ? (
          <CourseCard courseId={activeDragId} color="orange" />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default SemesterDropdowns;
