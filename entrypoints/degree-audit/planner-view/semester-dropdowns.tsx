import Button from "@/entrypoints/components/common/button";
import { Wrap } from "@/entrypoints/components/common/helperdivs";
import CourseCard from "@/entrypoints/components/course-card";
import {
  CourseId,
  SemesterSeason,
  StringSemester,
  Year,
} from "@/lib/general-types";
import {
  DndContext,
  DragOverEvent,
  DragOverlay,
  pointerWithin,
} from "@dnd-kit/core";
import { Plus } from "lucide-react";
import { useState } from "react";
import SemesterCard from "../components/semester-card";
import { useAuditContext } from "../providers/audit-provider";

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
      return `Spring ${year + 1}` as StringSemester;
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
    console.log("semesters", semesters);
    if (
      event.over?.id &&
      !courseMap[event.over.id] &&
      courseMap[event.active.id]?.semester !== event.over.id
    ) {
      moveCourseToNewSemester(event.active.id, event.over.id as StringSemester);
    } else if (
      !event.over &&
      courseMap[event.active.id]?.semester !== dragOrigin
    ) {
      console.log("course moved to new semester", event.active.id, dragOrigin);
      moveCourseToNewSemester(event.active.id, dragOrigin as StringSemester);
    }
  }

  return (
    <DndContext
      id="degree-planner-general"
      onDragStart={(event) => {
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
      <Wrap maxCols={2}>
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
          className="w-sm bg-[#579D42] text-white font-bold"
          onClick={() => {
            console.log(
              "adding future semester",
              Object.keys(combined).sort((a, b) =>
                sortSemesters(a as StringSemester, b as StringSemester),
              )[Object.keys(combined).length - 1],
            );
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
      </Wrap>
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
