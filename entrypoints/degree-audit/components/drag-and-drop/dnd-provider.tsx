import { DndContext, DragEndEvent, pointerWithin } from "@dnd-kit/core";
import { createContext } from "react";

interface DragAndDropContextType {
  isDragging: boolean;
  setIsDragging: (isDragging: boolean) => void;
}

const DragAndDropContext = createContext<DragAndDropContextType | null>(null);

const DragAndDropProvider = ({ children }: { children: React.ReactNode }) => {
  const [isDragging, setIsDragging] = useState(false);

  const onDragEnd = (event: DragEndEvent) => {
    console.log("onDragEnd", event);
    try {
      const foo = event.active.data;
      console.log("foo", foo);
    } catch (error) {
      console.error("Error getting data from active item", error);
    }
    setIsDragging(false);
  };

  return (
    <DragAndDropContext.Provider value={{ isDragging, setIsDragging }}>
      <DndContext onDragEnd={onDragEnd} collisionDetection={pointerWithin}>
        {children}
      </DndContext>
    </DragAndDropContext.Provider>
  );
};

export const useDragAndDrop = () => {
  const context = useContext(DragAndDropContext);
  if (!context) {
    throw new Error("useDragAndDrop must be used within a DragAndDropProvider");
  }
  return context;
};

export default DragAndDropProvider;
