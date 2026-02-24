import { HStack, VStack } from "@/entrypoints/components/common/helperdivs";
import Title from "@/entrypoints/components/common/text";
import { cn } from "@/lib/utils";
import {
  DndContext,
  DragEndEvent,
  pointerWithin,
  useDroppable,
} from "@dnd-kit/core";
import { createContext } from "react";
import Draggable from "./drag-and-drop/draggable";

const DraggableItem = ({
  id,
  className = "",
  title,
}: {
  id: string;
  className?: string;
  title: string;
}) => {
  const { registerDraggableItem } = useDragAndDrop();

  useEffect(() => {
    registerDraggableItem(id, "droppable-a");
  }, []);

  return (
    <Draggable id={id}>
      <div
        className={cn(
          "p-10 rounded-lg border-2 border-dotted border-black",
          className,
        )}
      >
        {title}
      </div>
    </Draggable>
  );
};

type DroppableItemProps = {
  id: string;
  title: string;
  className?: string;
};

const DroppableItem = ({ id, className = "", title }: DroppableItemProps) => {
  const { registerDroppableAreaIten: registerDroppableAreaItem, records } =
    useDragAndDrop();
  const { isOver, setNodeRef } = useDroppable({
    id,
  });

  useEffect(() => {
    registerDroppableAreaItem(id);
  }, []);

  return (
    <div ref={setNodeRef} className={cn(isOver ? "opacity-35" : "opacity-100")}>
      <div
        className={cn(
          "p-10 rounded-lg border-2 border-dotted border-black",
          className,
        )}
      >
        <VStack>
          <Title text={title} />
          {records[id]?.length > 0 ? (
            <DraggableItem id={records[id][0]} title={records[id][0]} />
          ) : (
            "No items"
          )}
        </VStack>
      </div>
    </div>
  );
};

interface DragAndDropContextType {
  records: Record<string, string[]>;
  registerDraggableItem: (id: string, areaId: string) => void;
  registerDroppableAreaIten: (id: string) => void;
}
const DragAndDropContext = createContext<DragAndDropContextType | null>(null);
const PlaygroundPage = () => {
  const [records, setRecords] = useState<Record<string, string[]>>({});

  const onDragEnd = (event: DragEndEvent) => {
    console.log("onDragEnd", event);
    const draggableItem = event.active;
    const areaItem = event.over?.id;
    if (draggableItem && areaItem) {
      let newRecords = records;
      // Remove the draggable item from all areas
      Object.keys(records).forEach((key) => {
        if (
          newRecords[key].findIndex(
            (item) => item === draggableItem.id.toString(),
          ) !== -1
        ) {
          newRecords[key].splice(
            newRecords[key].findIndex(
              (item) => item === draggableItem.id.toString(),
            ),
            1,
          );
        }
      });
      // Add the draggable item to the new area
      newRecords = {
        ...newRecords,
        [areaItem]: [
          ...(newRecords[areaItem] || []),
          draggableItem.id.toString(),
        ],
      };

      setRecords(newRecords);
    }
  };

  const registerDroppableAreaIten = (id: string) => {
    setRecords((prev) => ({
      ...prev,
      [id]: [],
    }));
  };

  const registerDraggableItem = (id: string, areaId: string) => {
    setRecords((prev) => ({
      ...prev,
      [areaId]: [...(prev[areaId] || []), id],
    }));
  };

  return (
    <DragAndDropContext.Provider
      value={{ records, registerDraggableItem, registerDroppableAreaIten }}
    >
      <DndContext onDragEnd={onDragEnd} collisionDetection={pointerWithin}>
        <VStack fill x="center">
          <Title text="Playground" />
          <HStack>
            <DraggableItem
              id="draggable-1"
              className="bg-blue-500"
              title="Draggable 1"
            />
            <DraggableItem
              id="draggable-2"
              className="bg-purple-400"
              title="Draggable 2"
            />
          </HStack>
          <HStack>
            <DroppableItem
              id="droppable-a"
              className="bg-green-500"
              title="Droppable A"
            />
            <DroppableItem
              id="droppable-b"
              className="bg-yellow-500"
              title="Droppable B"
            />
            <DroppableItem
              id="droppable-c"
              className="bg-red-500"
              title="Droppable C"
            />
          </HStack>
        </VStack>
      </DndContext>
    </DragAndDropContext.Provider>
  );
};

const useDragAndDrop = () => {
  const context = useContext(DragAndDropContext);
  if (!context) {
    throw new Error("useDragAndDrop must be used within a DragAndDropContext");
  }
  return context;
};

export default PlaygroundPage;
